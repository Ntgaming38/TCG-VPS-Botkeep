import { FALLBACK_PRODUCT_IMAGE_URL } from "@/const";
import { Button } from "@/components/ui/button";
import { productImageFrameStyle, productImageImageStyle } from "@/lib/productImageDisplay";

export type ImageEditPosition = { x: number; y: number };

type Props = {
  src?: string | null;
  alt: string;
  zoom: number;
  position: ImageEditPosition;
  onZoomChange: (zoom: number) => void;
  onPositionChange: (position: ImageEditPosition) => void;
  onReset: () => void;
};

export function ProductImageEditControls({ src, alt, zoom, position, onZoomChange, onPositionChange, onReset }: Props) {
  return <div className="grid gap-3 rounded-xl border border-border bg-background/50 p-3 sm:grid-cols-[150px_1fr]">
    <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-white" style={productImageFrameStyle()}>
      <img src={src || FALLBACK_PRODUCT_IMAGE_URL} alt={alt} draggable={false} className="h-full w-full select-none object-contain transition-transform duration-300 motion-reduce:transition-none" style={productImageImageStyle(zoom, position)} />
    </div>
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between gap-3"><LabelText>Zoom ảnh</LabelText><strong className="text-teal-300">{Math.round(zoom * 100)}%</strong></div>
      <input type="range" min="1" max="1.5" step="0.01" value={zoom} onChange={(event) => onZoomChange(Number(event.target.value))} className="w-full accent-teal-400" aria-label="Mức zoom ảnh trong biểu mẫu sửa" />
      <div className="grid grid-cols-2 gap-2"><label className="grid gap-1 text-xs text-muted-foreground">Vị trí ngang<input type="range" min="-50" max="50" step="1" value={position.x} onChange={(event) => onPositionChange({ ...position, x: Number(event.target.value) })} className="accent-teal-400" /></label><label className="grid gap-1 text-xs text-muted-foreground">Vị trí dọc<input type="range" min="-50" max="50" step="1" value={position.y} onChange={(event) => onPositionChange({ ...position, y: Number(event.target.value) })} className="accent-teal-400" /></label></div>
      <Button type="button" variant="outline" size="sm" onClick={onReset} className="w-full border-teal-400/60 text-teal-300 hover:bg-teal-400/10">Đặt lại vị trí và độ thu phóng</Button>
      <p className="text-xs leading-5 text-muted-foreground">Đưa ảnh về mức zoom mặc định và vị trí trung tâm. Nền trắng luôn phủ kín khung.</p>
    </div>
  </div>;
}

function LabelText({ children }: { children: React.ReactNode }) { return <span className="font-semibold text-foreground">{children}</span>; }
