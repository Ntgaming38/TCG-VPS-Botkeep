export const DATA_BACKUP_SCOPES = ["inventory", "purchases", "sales", "chyusen", "all"] as const;

export type DataBackupScope = (typeof DATA_BACKUP_SCOPES)[number];

export type DataBackupPayload = {
  formatVersion: "1.0";
  exportedAt: string;
  scope: DataBackupScope;
  inventory?: unknown[];
  purchases?: unknown[];
  sales?: unknown[];
  chyusen?: Record<string, unknown>;
};

export function createDataBackupPayload(
  scope: DataBackupScope,
  datasets: Omit<DataBackupPayload, "formatVersion" | "exportedAt" | "scope">,
  exportedAt = new Date().toISOString(),
): DataBackupPayload {
  const payload: DataBackupPayload = { formatVersion: "1.0", exportedAt, scope };
  if (scope === "inventory" || scope === "all") payload.inventory = datasets.inventory ?? [];
  if (scope === "purchases" || scope === "all") payload.purchases = datasets.purchases ?? [];
  if (scope === "sales" || scope === "all") payload.sales = datasets.sales ?? [];
  if (scope === "chyusen" || scope === "all") payload.chyusen = datasets.chyusen ?? {};
  return payload;
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const normalized = typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${normalized.replaceAll('"', '""')}"`;
}

export function rowsToCsv(rows: unknown[]) {
  const objects = rows.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && !Array.isArray(row));
  const headers = Array.from(new Set(objects.flatMap((row) => Object.keys(row))));
  if (!headers.length) return "";
  return [headers.map(csvCell).join(","), ...objects.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n");
}

export function getDataBackupFileName(scope: Exclude<DataBackupScope, "all">, extension: "csv" | "json", exportedAt = new Date()) {
  const date = exportedAt.toISOString().slice(0, 10);
  return `tcg-manager-${scope}-${date}.${extension}`;
}
