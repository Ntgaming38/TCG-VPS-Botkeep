import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

// TiDB Cloud needs SSL as object; mysql2 chokes on ?ssl=true boolean in URL.
// Parse URL and pass explicit host/user/db + ssl object (self-host fix).
const parsed = new URL(connectionString.replace(/\?ssl=.*$/, ""));
const database = decodeURIComponent(parsed.pathname.replace(/^\//, "") || "test");

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    host: parsed.hostname,
    port: Number(parsed.port) || 4000,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
    ssl: { rejectUnauthorized: true },
  },
});
