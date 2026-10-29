import { Skeleton } from "@/components/ui/skeleton";

/**
 * Khung xương (skeleton) cho các màn hình chính: hiện đúng hình dạng bố
 * cục thật trong lúc dữ liệu đang tải, để nội dung thật thay vào đúng chỗ
 * mà màn hình không bị nhảy — thay cho vòng xoay chờ trước đây.
 */

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Đang tải thống kê">
      <div>
        <Skeleton className="h-8 w-44" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border bg-card/40 p-4">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="mt-3 h-7 w-4/5" />
            <Skeleton className="mt-2 h-3 w-2/3" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border bg-card/40 p-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-3 h-40 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-36" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border bg-card/40 p-3">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="mt-2 h-3 w-1/3" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Đang tải danh sách sản phẩm">
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border bg-card/40 p-3">
            <Skeleton className="h-[52px] w-[52px] rounded-xl" />
            <div className="flex-1">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="mt-2 h-3 w-2/5" />
              <Skeleton className="mt-2 h-4 w-14 rounded-full" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Khung xương toàn trang dùng khi chuyển route (React.lazy) — thay vòng xoay. */
export function GenericPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#0b1220] p-3" aria-busy="true" aria-label="Đang tải trang">
      <Skeleton className="h-14 w-full rounded-2xl" />
      <div className="mt-4 space-y-3 px-1">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-60" />
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-[72px] w-full rounded-2xl" />
        <Skeleton className="h-[72px] w-full rounded-2xl" />
      </div>
    </div>
  );
}
