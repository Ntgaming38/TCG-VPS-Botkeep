export type LoginBackgroundEdit = {
  zoom: number;
  positionX: number;
  positionY: number;
  brightness: number;
};

export const DEFAULT_LOGIN_BACKGROUND_EDIT: LoginBackgroundEdit = {
  zoom: 1,
  positionX: 0,
  positionY: 0,
  brightness: 1,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getLoginBackgroundCropRect(imageWidth: number, imageHeight: number, edit: LoginBackgroundEdit, targetAspect = 16 / 9) {
  const imageAspect = imageWidth / imageHeight;
  const baseWidth = imageAspect > targetAspect ? imageHeight * targetAspect : imageWidth;
  const baseHeight = imageAspect > targetAspect ? imageHeight : imageWidth / targetAspect;
  const zoom = clamp(edit.zoom, 1, 2.5);
  const width = baseWidth / zoom;
  const height = baseHeight / zoom;
  const maxX = imageWidth - width;
  const maxY = imageHeight - height;

  return {
    x: clamp((maxX / 2) * (1 + clamp(edit.positionX, -1, 1)), 0, maxX),
    y: clamp((maxY / 2) * (1 + clamp(edit.positionY, -1, 1)), 0, maxY),
    width,
    height,
  };
}

export async function renderLoginBackgroundDataUrl(source: string, edit: LoginBackgroundEdit) {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Không thể mở ảnh để chỉnh sửa."));
    element.src = source;
  });

  const width = 1600;
  const height = 900;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Không thể khởi tạo công cụ chỉnh ảnh.");

  const crop = getLoginBackgroundCropRect(image.naturalWidth, image.naturalHeight, edit, width / height);
  context.filter = `brightness(${clamp(edit.brightness, 0.6, 1.4)})`;
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.86);
}
