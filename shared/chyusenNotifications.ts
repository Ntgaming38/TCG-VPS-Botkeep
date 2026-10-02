export type ChyusenNotificationReadState = { isRead?: boolean | number | null };

export function getUnreadChyusenCount(notifications: ChyusenNotificationReadState[] | undefined | null): number {
  return (notifications || []).filter((notification) => !notification.isRead).length;
}
