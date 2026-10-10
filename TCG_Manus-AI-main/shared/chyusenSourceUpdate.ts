export type ChyusenSourceDraftInput = {
  label: string;
  sourceUrl: string;
  checkIntervalMinutes: string;
  isActive: boolean;
};

export function createChyusenSourceUpdatePayload(id: number, draft: ChyusenSourceDraftInput) {
  const sourceUrl = draft.sourceUrl.trim();
  if (!sourceUrl) throw new Error("URL nguồn không được để trống.");
  return {
    id,
    label: draft.label.trim() || undefined,
    sourceUrl,
    checkIntervalMinutes: Number(draft.checkIntervalMinutes) as 60 | 180 | 360 | 720 | 1440,
    isActive: draft.isActive,
  };
}
