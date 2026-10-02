export const MOBILE_SIDEBAR_EDGE_PX = 28;
export const MOBILE_SIDEBAR_MIN_SWIPE_PX = 64;

export function shouldOpenMobileSidebarFromSwipe(input: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}) {
  const horizontalDistance = input.endX - input.startX;
  const verticalDistance = Math.abs(input.endY - input.startY);
  return input.startX <= MOBILE_SIDEBAR_EDGE_PX
    && horizontalDistance >= MOBILE_SIDEBAR_MIN_SWIPE_PX
    && horizontalDistance > verticalDistance * 1.25;
}
