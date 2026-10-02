import { OAUTH_STATE_COOKIE, encodeOAuthState } from "@shared/const";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** Ảnh dùng chung khi sản phẩm chưa có ảnh hoặc ảnh nguồn không tải được. */
export const FALLBACK_PRODUCT_IMAGE_URL = "/manus-storage/tcg-product-fallback_93dfd725.png";

// Self-host login. Call this from an event handler at the moment you want to navigate.
// Manus OAuth removed for Oracle VPS free deploy. Set VITE_OAUTH_PORTAL_URL to use old portal.
export const startLogin = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  if (oauthPortalUrl) {
    const appId = import.meta.env.VITE_APP_ID;
    const redirectUri = `${window.location.origin}/api/oauth/callback`;

    const nonce = crypto.randomUUID();
    document.cookie = `${OAUTH_STATE_COOKIE}=${nonce}; Path=/; Max-Age=600; SameSite=None; Secure`;
    const state = encodeOAuthState({ redirectUri, nonce });

    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");

    window.location.href = url.toString();
    return;
  }
  window.location.href = "/login";
};
