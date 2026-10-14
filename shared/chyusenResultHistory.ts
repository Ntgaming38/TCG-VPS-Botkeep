/**
 * Phân loại kết quả lượt đăng ký Chūsen cho trang Lịch sử kết quả.
 *
 * Lịch sử kết quả KHÁC với lịch sử hoạt động (`chyusen_history` chỉ lưu vết
 * thay đổi từng trường). Trang Lịch sử kết quả chỉ hiển thị đúng một dòng cho
 * mỗi lượt `chyusen_entries` đã có kết quả cuối cùng, không tạo bản ghi trùng.
 */

export type ChyusenResultOutcome = "won" | "lost" | "cancelled";

export type ChyusenResultHistoryEntry = {
  id: number;
  applicationStatus?: string | null;
  resultStatus?: string | null;
  deletedAt?: Date | string | null;
};

/**
 * Suy ra một trạng thái kết quả duy nhất từ dữ liệu cũ.
 *
 * Thứ tự ưu tiên giữ đúng ý nghĩa nghiệp vụ:
 * - Đã trúng luôn thắng mọi trạng thái khác vì lượt đó đã mở khóa Mua Hàng.
 * - Hủy là hành động chủ động cuối cùng nên thắng Trượt.
 * - Trượt thắng mọi trạng thái chưa có kết quả, kể cả khi bản ghi đã xóa mềm
 *   vì `setParticipation("lost")` luôn xóa mềm lượt trượt vào Thùng rác.
 * - Trả về null khi lượt chưa có kết quả, để trang Lịch sử loại khỏi danh sách.
 */
export function getChyusenResultOutcome(entry: ChyusenResultHistoryEntry): ChyusenResultOutcome | null {
  if (entry.applicationStatus === "won" || entry.resultStatus === "won") return "won";
  if (entry.applicationStatus === "cancelled") return "cancelled";
  if (entry.applicationStatus === "lost" || entry.resultStatus === "lost") return "lost";
  return null;
}

/**
 * Định dạng ngày đầy đủ kèm năm theo giờ Nhật (giống phần còn lại của Chūsen)
 * để trang Lịch sử phân biệt được các năm. Trả về null khi không có giá trị.
 */
export function formatChyusenResultDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date).reduce<Record<string, string>>((accumulator, part) => ({ ...accumulator, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export type ChyusenResultHistoryStats = {
  total: number;
  won: number;
  lost: number;
  cancelled: number;
  /** Tỷ lệ trúng = trúng / (trúng + trượt); lượt hủy KHÔNG tính vào mẫu số. */
  winRate: number | null;
};

/**
 * Tính thống kê từ danh sách các kết quả đã phân loại.
 * Lượt hủy được đếm riêng và không tính vào mẫu số tỷ lệ trúng.
 */
export function summarizeChyusenResultHistory(outcomes: ChyusenResultOutcome[]): ChyusenResultHistoryStats {
  const won = outcomes.filter((outcome) => outcome === "won").length;
  const lost = outcomes.filter((outcome) => outcome === "lost").length;
  const cancelled = outcomes.filter((outcome) => outcome === "cancelled").length;
  const denominator = won + lost;
  return {
    total: outcomes.length,
    won,
    lost,
    cancelled,
    winRate: denominator > 0 ? won / denominator : null,
  };
}

export type ChyusenShopStats = {
  /** Tổng mọi lượt đã đăng ký của cửa hàng (gồm chờ kết quả và đã hủy). */
  total: number;
  won: number;
  lost: number;
  cancelled: number;
  /** Lượt chưa có kết quả cuối cùng. */
  pending: number;
  /** Số mẫu hợp lệ dùng để tính tỷ lệ trúng = trúng + trượt. */
  sampleSize: number;
  /** Tỷ lệ trúng = trúng / (trúng + trượt); null khi chưa đủ dữ liệu. */
  winRate: number | null;
};

export type ChyusenShopStatsEntry = ChyusenResultHistoryEntry & {
  shop?: string | null;
  customShopName?: string | null;
};

/**
 * Lấy tên cửa hàng chuẩn của một lượt, giống `displayChyusenShop` ở trang Chūsen
 * để thống kê nhóm đúng theo cùng một cửa hàng. Tên đã được trim và gộp khoảng
 * trắng; hai cửa hàng khác tên sẽ không bị gộp nhầm.
 */
export function resolveChyusenShopName(entry: { shop?: string | null; customShopName?: string | null }) {
  const name = (entry.customShopName?.trim() || entry.shop?.trim() || "").replace(/\s+/g, " ");
  return name || "Khác";
}

/**
 * Nhóm thống kê theo từng cửa hàng.
 *
 * Dùng chung `getChyusenResultOutcome` nên mỗi lượt chỉ rơi về đúng một kết quả
 * cuối cùng (Đã trúng / Trượt / Hủy). Lượt chưa có kết quả được đếm riêng vào
 * `pending` và KHÔNG tính vào mẫu số tỷ lệ trúng, đúng yêu cầu nghiệp vụ.
 * Kết quả trả về map theo tên cửa hàng, chỉ chứa các cửa hàng có dữ liệu.
 */
export function summarizeChyusenShopStats(entries: ChyusenShopStatsEntry[]): Record<string, ChyusenShopStats> {
  const byShop = new Map<string, { won: number; lost: number; cancelled: number; pending: number }>();
  for (const entry of entries) {
    const shop = resolveChyusenShopName(entry);
    const bucket = byShop.get(shop) ?? { won: 0, lost: 0, cancelled: 0, pending: 0 };
    const outcome = getChyusenResultOutcome(entry);
    if (outcome === "won") bucket.won += 1;
    else if (outcome === "lost") bucket.lost += 1;
    else if (outcome === "cancelled") bucket.cancelled += 1;
    else bucket.pending += 1;
    byShop.set(shop, bucket);
  }
  const result: Record<string, ChyusenShopStats> = {};
  byShop.forEach((bucket, shop) => {
    const sampleSize = bucket.won + bucket.lost;
    result[shop] = {
      total: bucket.won + bucket.lost + bucket.cancelled + bucket.pending,
      won: bucket.won,
      lost: bucket.lost,
      cancelled: bucket.cancelled,
      pending: bucket.pending,
      sampleSize,
      winRate: sampleSize > 0 ? bucket.won / sampleSize : null,
    };
  });
  return result;
}
