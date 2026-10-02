import { and, eq } from "drizzle-orm";
import { reportBranding } from "../drizzle/schema";
import { getDb } from "./db";
import { parseAvatarDataUrl } from "./userProfile";
import { storagePut } from "./storage";

export const DEFAULT_REPORT_ACCENT_COLOR = "#DC2626";

function normalizeAccentColor(value?: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value || "") ? value!.toUpperCase() : DEFAULT_REPORT_ACCENT_COLOR;
}

export async function getReportBranding(userId: number) {
  const database = await getDb();
  if (!database) return undefined;
  const [current] = await database.select().from(reportBranding).where(eq(reportBranding.userId, userId)).limit(1);
  return current ?? { userId, accentColor: DEFAULT_REPORT_ACCENT_COLOR, logoUrl: null };
}

export async function saveReportBranding(userId: number, input: { accentColor?: string; logoUrl?: string | null }) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const current = await getReportBranding(userId);
  const update = {
    accentColor: input.accentColor === undefined ? current?.accentColor || DEFAULT_REPORT_ACCENT_COLOR : normalizeAccentColor(input.accentColor),
    logoUrl: input.logoUrl === undefined ? current?.logoUrl || null : input.logoUrl,
  };
  const [existing] = await database.select({ id: reportBranding.id }).from(reportBranding).where(eq(reportBranding.userId, userId)).limit(1);
  if (existing) await database.update(reportBranding).set(update).where(and(eq(reportBranding.id, existing.id), eq(reportBranding.userId, userId)));
  else await database.insert(reportBranding).values({ userId, ...update });
  return getReportBranding(userId);
}

export async function uploadReportLogo(userId: number, imageDataUrl: string) {
  const image = parseAvatarDataUrl(imageDataUrl);
  return storagePut(`report-logos/${userId}/logo.${image.extension}`, image.data, image.contentType);
}
