import crypto from "node:crypto";

export const CHYUSEN_TIMEZONE = "Asia/Tokyo";
export const ALLOWED_CHYUSEN_HOSTS = [
  "p-bandai.jp",
  "joshinweb.jp",
  "geo-online.co.jp",
  "furu1.net",
  "toysrus.co.jp",
  "lawson.co.jp",
  "7net.omni7.jp",
  "family.co.jp",
] as const;
export const OFFICIAL_X_HANDLES = ["p_bandai", "Pokemon_cojp", "ONEPIECE_tcg"] as const;

export type ChyusenTimeState = "open" | "expiring" | "expired" | "waiting_result" | "result_ready" | "upcoming";
export type ChyusenUrgency = "deadline_72h" | "deadline_24h" | "deadline_3h" | null;

export function validatePublicChyusenUrl(rawUrl: string): { valid: boolean; normalizedUrl?: string; reason?: string } {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return { valid: false, reason: "URL không hợp lệ." };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { valid: false, reason: "Chỉ hỗ trợ URL HTTP hoặc HTTPS công khai." };
  }

  const host = url.hostname.toLowerCase();
  const isAllowedPublisher = ALLOWED_CHYUSEN_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  const xMatch = host === "x.com" || host === "www.x.com";
  const xParts = url.pathname.split("/").filter(Boolean);
  const isOfficialXPost = xMatch
    && xParts.length >= 3
    && OFFICIAL_X_HANDLES.includes(xParts[0] as (typeof OFFICIAL_X_HANDLES)[number])
    && xParts[1] === "status";

  if (!isAllowedPublisher && !isOfficialXPost) {
    return { valid: false, reason: "Link chưa thuộc nguồn công khai được hỗ trợ. Hãy dùng link từ shop/nhà phát hành chính thức hoặc bài X chính thức." };
  }

  return { valid: true, normalizedUrl: url.toString() };
}

export function getSourceLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Nguồn công khai";
  }
}

export function hashSourceContent(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractHtmlTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripHtml(match[1]).trim().slice(0, 255) || null : null;
}

export function extractMetaImage(html: string): string | null {
  const match = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i);
  return match?.[1] || null;
}

export function detectProductType(text: string): "card" | "box" | "pack" | "set" | "other" {
  if (/\bBOX\b|ボックス|拡張パック\s*BOX/i.test(text)) return "box";
  if (/パック|ブースター/i.test(text)) return "pack";
  if (/カード|card/i.test(text)) return "card";
  if (/セット|set/i.test(text)) return "set";
  return "other";
}

export function detectSeries(text: string): string {
  if (/one\s*piece|ワンピース/i.test(text)) return "One Piece";
  return "Pokemon";
}

export function detectShop(text: string, url: string): { shop: string; customShopName?: string } {
  const values = ["Geo", "Joshin", "Fruichi", "Toysrus", "Lawson", "Seven Eleven", "Family Mart"] as const;
  const normalized = `${text} ${url}`.toLowerCase();
  const checks: Array<[typeof values[number], RegExp]> = [
    ["Geo", /geo|ゲオ/i],
    ["Joshin", /joshin|上新/i],
    ["Fruichi", /furuichi|ふるいち|古本市場/i],
    ["Toysrus", /toysrus|トイザらス/i],
    ["Lawson", /lawson|ローソン/i],
    ["Seven Eleven", /seven|7net|セブン/i],
    ["Family Mart", /family\s*mart|ファミリーマート/i],
  ];
  const match = checks.find(([, pattern]) => pattern.test(normalized));
  return match ? { shop: match[0] } : { shop: "Khác" };
}

function makeTokyoDate(year: string, month: string, day: string, hour: string, minute: string): Date | null {
  const normalized = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:00+09:00`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Returns only full date+time values; it deliberately rejects missing years/times. */
export function extractExplicitTokyoDates(text: string): Date[] {
  const matches = [
    ...Array.from(text.matchAll(/(20\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日(?:\s*[（(]?[月火水木金土日][）)]?)?\s*(\d{1,2})\s*[:：]\s*(\d{2})/g)),
    ...Array.from(text.matchAll(/(20\d{2})[/.\-](\d{1,2})[/.\-](\d{1,2})\s*(\d{1,2})\s*[:：]\s*(\d{2})/g)),
  ];
  return matches
    .map((match) => makeTokyoDate(match[1], match[2], match[3], match[4], match[5]))
    .filter((date): date is Date => Boolean(date));
}

export function findDateNearKeywords(text: string, keywords: string[]): Date | null {
  const sentenceCandidates = text.split(/[。\n]|\s{3,}/).filter(Boolean);
  for (const candidate of sentenceCandidates) {
    if (keywords.some((keyword) => candidate.includes(keyword))) {
      const date = extractExplicitTokyoDates(candidate)[0];
      if (date) return date;
    }
  }
  return null;
}

export function detectPrice(text: string): number | null {
  const match = text.match(/(?:税込|価格|販売価格)?\s*[¥￥]?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{3,})\s*円/);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

export function detectQuantityLimit(text: string): string | null {
  const match = text.match(/お一人様\s*(\d+)\s*(BOX|ボックス|パック|個|枚)?\s*(?:まで|限り)/i);
  if (!match) return null;
  return `${match[1]}${match[2] ? ` ${match[2]}` : ""} / người`;
}

export function getChyusenUrgency(deadline: Date | null | undefined, now = new Date()): ChyusenUrgency {
  if (!deadline) return null;
  const hours = (deadline.getTime() - now.getTime()) / 3_600_000;
  if (hours <= 0) return null;
  if (hours <= 3) return "deadline_3h";
  if (hours <= 24) return "deadline_24h";
  if (hours <= 72) return "deadline_72h";
  return null;
}

export function getChyusenTimeState(entry: { applicationStart?: Date | null; applicationEnd?: Date | null; resultDate?: Date | null }, now = new Date()): ChyusenTimeState {
  if (entry.applicationStart && now < entry.applicationStart) return "upcoming";
  if (entry.applicationEnd && now <= entry.applicationEnd) {
    return getChyusenUrgency(entry.applicationEnd, now) ? "expiring" : "open";
  }
  if (entry.resultDate && now < entry.resultDate) return "waiting_result";
  if (entry.resultDate && now >= entry.resultDate) return "result_ready";
  return "expired";
}

export function formatRemainingTime(deadline: Date | null | undefined, now = new Date()): string | null {
  if (!deadline) return null;
  const totalMinutes = Math.floor((deadline.getTime() - now.getTime()) / 60_000);
  if (totalMinutes <= 0) return "Đã hết hạn";
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `Còn ${days} ngày ${hours} giờ`;
  if (hours > 0) return `Còn ${hours} giờ ${minutes} phút`;
  return `Còn ${minutes} phút`;
}
