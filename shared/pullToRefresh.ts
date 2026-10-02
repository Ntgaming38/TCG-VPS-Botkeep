export function shouldTriggerPullToRefresh({
  startX,
  startY,
  endX,
  endY,
  scrollTop,
  disabled = false,
  threshold = 72,
}: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  scrollTop: number;
  disabled?: boolean;
  threshold?: number;
}) {
  if (disabled) return false;
  const deltaX = Math.abs(endX - startX);
  const deltaY = endY - startY;
  return scrollTop <= 0 && deltaY >= threshold && deltaY > deltaX;
}
