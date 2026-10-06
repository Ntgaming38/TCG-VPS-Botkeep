#!/usr/bin/env node
/**
 * db-sync.cjs — Đồng bộ schema DB cho self-host (VPS) một cách AN TOÀN.
 *
 * Đặc tính:
 *  - CHỈ thao tác bổ sung: CREATE TABLE IF NOT EXISTS, ALTER ADD UNIQUE,
 *    ALTER enum mở rộng thêm giá trị, sao chép mật khẩu cũ → auth_credentials.
 *  - KHÔNG DROP, KHÔNG TRUNCATE, KHÔNG XÓA BẤT KỲ DỮ LIỆU NÀO.
 *  - Idempotent — chạy lại bao nhiêu lần cũng được.
 *
 * Cách dùng:
 *   node scripts/db-sync.cjs --check     # chỉ báo cáo, không sửa gì
 *   node scripts/db-sync.cjs             # áp dụng các thay đổi bổ sung
 *   node scripts/db-sync.cjs --journal   # như trên + đồng bộ drizzle migration journal
 *                                         # (chạy MỘT LẦN để pnpm db:push không
 *                                         #  bị lỗi "duplicate index" ở migration cũ)
 *
 * Sau khi chạy: pnpm build && pm2 restart all
 */
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const argv = new Set(process.argv.slice(2));
const CHECK_ONLY = argv.has("--check");
const SYNC_JOURNAL = argv.has("--journal");

if (argv.has("--help") || argv.has("-h")) {
  console.log(
    [
      "Usage: node scripts/db-sync.cjs [--check] [--journal]",
      "",
      "  --check    Báo cáo trạng thái, không thay đổi gì.",
      "  --journal  Đồng bộ drizzle migration journal về migration mới nhất",
      "             (CHỈ dùng sau khi toàn bộ bước khác đã OK).",
    ].join("\n")
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const results = [];
function ok(msg) { results.push(["ok", msg]); console.log(`  [ok]   ${msg}`); }
function skip(msg) { results.push(["skip", msg]); console.log(`  [skip] ${msg}`); }
function apply(msg) { results.push([CHECK_ONLY ? "would" : "apply", msg]); console.log(`  [${CHECK_ONLY ? "would" : "++++"}] ${msg}`); }
function warn(msg) { results.push(["warn", msg]); console.log(`  [warn] ${msg}`); }
function fail(msg) { results.push(["fail", msg]); console.log(`  [FAIL] ${msg}`); }

function loadEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"') && v.length > 1) ||
      (v.startsWith("'") && v.endsWith("'") && v.length > 1)
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

function resolveDatabaseUrl() {
  const envFile = loadEnvFile(path.join(root, ".env"));
  const url = process.env.DATABASE_URL || envFile.DATABASE_URL;
  if (!url) {
    console.error("ERROR: DATABASE_URL không tìm thấy (process.env hoặc file .env).");
    process.exit(1);
  }
  return url;
}

function connectOptions(url) {
  // Tương tự drizzle.config.ts: tách ?ssl=... vì mysql2 không xử lý query param ssl.
  const sslMatch = url.match(/[?&]ssl=([^&]*)/);
  const sslValue = sslMatch ? decodeURIComponent(sslMatch[1]) : null;
  const clean = url.replace(/[?&]ssl=.*$/, "");
  const parsed = new URL(clean);
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, "") || "test");
  const base = {
    host: parsed.hostname,
    port: Number(parsed.port) || 4000,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
    connectTimeout: 20000,
  };
  if (sslValue === "0" || sslValue === "false" || process.env.DB_SYNC_NO_SSL === "1") {
    return { options: base, ssl: false };
  }
  // TiDB Cloud cần SSL (drizzle.config.ts cũng làm vậy).
  return { options: base, ssl: true };
}

async function main() {
  const mysql = require("mysql2/promise");
  const url = resolveDatabaseUrl();
  const { options, ssl } = connectOptions(url);

  console.log(`\ndb-sync → ${options.user}@${options.host}:${options.port}/${options.database}`);
  console.log(`Mode: ${CHECK_ONLY ? "CHECK (không thay đổi)" : "APPLY (chỉ bổ sung, không xóa gì)"}${SYNC_JOURNAL ? " + journal sync" : ""}\n`);

  let conn;
  try {
    try {
      conn = await mysql.createConnection({ ...options, ssl: ssl ? { rejectUnauthorized: true } : undefined });
    } catch (e) {
      if (!ssl) throw e;
      console.log("  (thử lại không có SSL...)");
      conn = await mysql.createConnection(options);
    }

    const q = async (sql, params) => (await conn.query(sql, params))[0];
    const tableExists = async (table) => {
      const rows = await q(
        "SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1",
        [table]
      );
      return rows.length > 0;
    };
    const columnInfo = async (table, column) => {
      const rows = await q(
        "SELECT COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1",
        [table, column]
      );
      return rows[0] || null;
    };
    const indexExists = async (table, index) => {
      const rows = await q(
        "SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1",
        [table, index]
      );
      return rows.length > 0;
    };

    // 1. auth_credentials (migration 0041)
    console.log("1) Table auth_credentials:");
    if (await tableExists("auth_credentials")) {
      ok("auth_credentials đã tồn tại");
    } else {
      apply("Tạo bảng auth_credentials");
      if (!CHECK_ONLY) {
        await q(`CREATE TABLE IF NOT EXISTS \`auth_credentials\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`userId\` int NOT NULL,
          \`email\` varchar(320) NOT NULL,
          \`passwordHash\` varchar(255) NOT NULL,
          \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`auth_credentials_userId_unique\` (\`userId\`),
          UNIQUE KEY \`auth_credentials_email_unique\` (\`email\`)
        )`);
      }
    }

    // 2. email_auth_challenges (migration 0044 + 0045)
    console.log("2) Table email_auth_challenges:");
    if (await tableExists("email_auth_challenges")) {
      ok("email_auth_challenges đã tồn tại");
      if (!(await columnInfo("email_auth_challenges", "rememberMe"))) {
        apply("Thêm cột rememberMe (migration 0045)");
        if (!CHECK_ONLY) await q("ALTER TABLE `email_auth_challenges` ADD `rememberMe` int NOT NULL DEFAULT 0");
      } else {
        ok("cột rememberMe đã có");
      }
    } else {
      apply("Tạo bảng email_auth_challenges");
      if (!CHECK_ONLY) {
        await q(`CREATE TABLE IF NOT EXISTS \`email_auth_challenges\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`email\` varchar(320) NOT NULL,
          \`purpose\` enum('registration','password_reset') NOT NULL,
          \`codeHash\` varchar(64) NOT NULL,
          \`name\` varchar(100) DEFAULT NULL,
          \`passwordHash\` varchar(255) DEFAULT NULL,
          \`rememberMe\` int NOT NULL DEFAULT 0,
          \`expiresAt\` timestamp NOT NULL,
          \`attempts\` int NOT NULL DEFAULT 0,
          \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`email_auth_challenges_email_purpose_unique\` (\`email\`,\`purpose\`)
        )`);
      }
    }
    if (await tableExists("email_auth_challenges")) {
      if (await indexExists("email_auth_challenges", "email_auth_challenges_expiry_idx")) {
        ok("index email_auth_challenges_expiry_idx đã có");
      } else {
        apply("Tạo index email_auth_challenges_expiry_idx");
        if (!CHECK_ONLY) await q("CREATE INDEX `email_auth_challenges_expiry_idx` ON `email_auth_challenges` (`expiresAt`)");
      }
    }

    // 3. Migrate mật khẩu cũ: users.passwordHash → auth_credentials (BỔ SUNG)
    console.log("3) Migrate mật khẩu cũ (users.passwordHash → auth_credentials):");
    const usersPwdCol = await columnInfo("users", "passwordHash");
    if (!usersPwdCol) {
      ok("users không còn cột passwordHash — bỏ qua");
    } else {
      const stats = (await q(
        "SELECT COUNT(*) AS total, SUM(CASE WHEN passwordHash LIKE 'scrypt$%' THEN 1 ELSE 0 END) AS scrypt FROM users WHERE passwordHash IS NOT NULL AND email IS NOT NULL AND email <> ''"
      ))[0];
      const total = Number(stats.total || 0);
      const scrypt = Number(stats.scrypt || 0);
      if (total === 0) {
        ok("không có mật khẩu cũ cần migrate");
      } else {
        if (scrypt < total) {
          warn(`${total - scrypt} mật khẩu cũ KHÔNG phải định dạng scrypt$ — có thể không đăng nhập được bằng mật khẩu cũ (dùng OTP email hoặc ADMIN_PASSWORD).`);
        }
        if (CHECK_ONLY) {
          apply(`sao chép tối đa ${total} mật khẩu cũ vào auth_credentials`);
        } else {
          const r = await q(
            `INSERT IGNORE INTO \`auth_credentials\` (\`userId\`, \`email\`, \`passwordHash\`, \`createdAt\`, \`updatedAt\`)
             SELECT \`id\`, \`email\`, \`passwordHash\`, NOW(), NOW() FROM \`users\`
             WHERE \`passwordHash\` IS NOT NULL AND \`email\` IS NOT NULL AND \`email\` <> ''`
          );
          const inserted = r.affectedRows || 0;
          if (inserted < total) {
            warn(`chèn ${inserted}/${total} dòng (còn lại đã trùng userId/email — kiểm tra tay nếu cần)`);
          } else {
            ok(`đã chèn ${inserted} mật khẩu cũ vào auth_credentials`);
          }
        }
      }
    }

    // 4. Mở rộng enum products.type: + junk_pack (BỔ SUNG giá trị, giữ nguyên dữ liệu)
    console.log("4) Enum products.type:");
    const typeCol = await columnInfo("products", "type");
    if (!typeCol) {
      warn("không tìm thấy products.type — bỏ qua");
    } else if (String(typeCol.COLUMN_TYPE).includes("junk_pack")) {
      ok(`products.type đã có junk_pack (${typeCol.COLUMN_TYPE})`);
    } else {
      const newType = String(typeCol.COLUMN_TYPE).replace(/\)\s*$/, ",'junk_pack')");
      let sql = `ALTER TABLE \`products\` MODIFY COLUMN \`type\` ${newType}`;
      if (typeCol.IS_NULLABLE === "NO") sql += " NOT NULL";
      if (typeCol.COLUMN_DEFAULT !== null && typeCol.COLUMN_DEFAULT !== undefined) {
        sql += ` DEFAULT '${String(typeCol.COLUMN_DEFAULT).replace(/'/g, "''")}'`;
      }
      apply(`mở rộng enum: ${typeCol.COLUMN_TYPE} → ${newType}`);
      if (!CHECK_ONLY) await q(sql);
    }

    // 5. Unique constraints còn thiếu (BỔ SUNG — chỉ tạo khi chắc chắn không trùng)
    console.log("5) Unique constraints:");
    const uniques = [
      { table: "users", cols: ["openId"], name: "users_openId_unique" },
      { table: "chyusen_notification_settings", cols: ["userId"], name: "chyusen_notification_settings_user_unique" },
      { table: "auto_backup_settings", cols: ["scheduleCronTaskUid"], name: "auto_backup_settings_scheduleCronTaskUid_unique" },
    ];
    for (const u of uniques) {
      if (!(await tableExists(u.table))) {
        skip(`${u.name}: bảng ${u.table} chưa tồn tại`);
        continue;
      }
      if (await indexExists(u.table, u.name)) {
        ok(`${u.name} đã có`);
        continue;
      }
      const groupCols = u.cols.map((c) => `\`${c}\``).join(", ");
      const dupRows = await q(
        `SELECT ${groupCols}, COUNT(*) AS cnt FROM \`${u.table}\` GROUP BY ${groupCols} HAVING COUNT(*) > 1 LIMIT 5`
      );
      if (dupRows.length > 0) {
        fail(`${u.name}: phát hiện dữ liệu TRÙNG — KHÔNG tạo unique để tránh mất dữ liệu. Dòng lỗi: ${JSON.stringify(dupRows).slice(0, 300)}`);
        continue;
      }
      apply(`tạo unique ${u.name} trên ${u.table}(${u.cols.join(",")})`);
      if (!CHECK_ONLY) await q(`ALTER TABLE \`${u.table}\` ADD UNIQUE KEY \`${u.name}\` (${groupCols})`);
    }

    // 6. Drizzle migration journal
    console.log("6) Drizzle migration journal:");
    const journalFile = path.join(root, "drizzle", "meta", "_journal.json");
    const journal = JSON.parse(fs.readFileSync(journalFile, "utf8"));
    const lastEntry = journal.entries[journal.entries.length - 1];
    const lastWhen = Number(lastEntry.when);

    // Drizzle tạo bảng __drizzle_migrations trong DB hiện tại (không qualify schema).
    // Một số DB cũ có thể nằm trong schema `drizzle` — kiểm tra cả hai.
    const locations = [];
    for (const schema of [options.database, "drizzle"]) {
      const rows = await q(
        "SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = '__drizzle_migrations' LIMIT 1",
        [schema]
      );
      if (rows.length > 0) locations.push(schema);
    }
    const readMax = async (schema) => {
      const rows = await q(`SELECT MAX(created_at) AS m FROM \`${schema}\`.\`__drizzle_migrations\``);
      return rows[0] && rows[0].m != null ? Number(rows[0].m) : null;
    };

    if (locations.length === 0) {
      ok("bảng __drizzle_migrations chưa tồn tại — sẽ do pnpm db:push tự tạo khi cần");
      if (SYNC_JOURNAL && !CHECK_ONLY) {
        apply(`tạo __drizzle_migrations và đặt mốc = journal mới nhất (${lastWhen}, idx ${lastEntry.idx})`);
        await q(`CREATE TABLE IF NOT EXISTS \`${options.database}\`.\`__drizzle_migrations\` (
          \`id\` serial PRIMARY KEY,
          \`hash\` text NOT NULL,
          \`created_at\` bigint
        )`);
        await q(
          `INSERT INTO \`${options.database}\`.\`__drizzle_migrations\` (\`hash\`, \`created_at\`) VALUES (?, ?)`,
          ["db-sync-manual", lastWhen]
        );
      } else if (!CHECK_ONLY) {
        skip("không sync journal (thêm flag --journal nếu muốn)");
      }
    } else {
      for (const schema of locations) {
        const max = await readMax(schema);
        if (max == null) {
          warn(`${schema}.__drizzle_migrations trống — journal chưa ghi nhận migration nào`);
          if (SYNC_JOURNAL && !CHECK_ONLY) {
            apply(`đặt mốc journal ${schema} = ${lastWhen} (idx ${lastEntry.idx})`);
            await q(`INSERT INTO \`${schema}\`.\`__drizzle_migrations\` (\`hash\`, \`created_at\`) VALUES (?, ?)`, [
              "db-sync-manual",
              lastWhen,
            ]);
          }
        } else if (max === lastWhen) {
          ok(`${schema}.__drizzle_migrations đã đồng bộ (mốc ${max} = journal mới nhất)`);
        } else if (max < lastWhen) {
          warn(`${schema}.__drizzle_migrations đang ở ${max} < journal ${lastWhen} — migration từ ${max} → ${lastWhen} chưa được ghi nhận`);
          if (SYNC_JOURNAL && !CHECK_ONLY) {
            apply(`đẩy mốc journal ${schema}: ${max} → ${lastWhen} (idx ${lastEntry.idx})`);
            await q(`UPDATE \`${schema}\`.\`__drizzle_migrations\` SET created_at = ? WHERE created_at = ?`, [lastWhen, max]);
          } else if (!CHECK_ONLY) {
            skip("không sync journal (chạy lại với --journal sau khi mọi bước khác OK)");
          }
        } else {
          warn(`${schema}.__drizzle_migrations (${max}) lớn hơn journal mới nhất (${lastWhen}) — cần kiểm tra thủ công`);
        }
      }
    }

    await conn.end();
  } catch (err) {
    if (conn) { try { await conn.end(); } catch {} }
    fail(err.message);
  }

  // Tổng kết
  const counts = { ok: 0, skip: 0, apply: 0, would: 0, warn: 0, fail: 0 };
  for (const [status] of results) counts[status] = (counts[status] || 0) + 1;
  console.log(`\nTổng kết: ${counts.ok} ok, ${counts.apply + counts.would} thay đổi${CHECK_ONLY ? " (sẽ áp dụng)" : " đã áp dụng"}, ${counts.warn} cảnh báo, ${counts.fail} lỗi.`);
  if (counts.fail > 0) {
    console.log("→ CÓ LỖI. Xem lại các dòng [FAIL] ở trên.");
    process.exit(1);
  }
  if (!CHECK_ONLY && !SYNC_JOURNAL) {
    console.log("→ Hoàn tất. Tiếp theo: pnpm build && pm2 restart all");
  }
  process.exit(0);
}

main();



