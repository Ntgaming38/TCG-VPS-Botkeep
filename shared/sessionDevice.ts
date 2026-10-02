export function getSessionDeviceLabel(userAgent?: string | null) {
  const source = (userAgent || "").toLowerCase();
  const platform = source.includes("iphone") || source.includes("ipad") ? "iPhone / iPad" : source.includes("android") ? "Android" : source.includes("mac os") ? "Mac" : source.includes("windows") ? "Windows" : source.includes("linux") ? "Linux" : "Thiết bị không xác định";
  const browser = source.includes("edg/") ? "Edge" : source.includes("firefox/") ? "Firefox" : source.includes("safari/") && !source.includes("chrome/") ? "Safari" : source.includes("chrome/") ? "Chrome" : "Trình duyệt";
  return `${platform} · ${browser}`;
}

export const LOGOUT_ALL_CONFIRMATION = "ĐĂNG XUẤT TẤT CẢ";
