export type ChyusenPreviewFallbackDraft = {
  sourceUrl: string;
  parserStatus: "manual" | "partial" | "detected" | "unavailable";
  parserNote: string;
};

export function createChyusenPreviewFallback<T extends ChyusenPreviewFallbackDraft>(draft: T): T {
  return {
    ...draft,
    sourceUrl: "",
    parserStatus: "unavailable",
    parserNote: "Không thể đọc link này. Bạn có thể tiếp tục nhập thông tin thủ công và lưu 抽選 mà không cần URL nguồn.",
  };
}
