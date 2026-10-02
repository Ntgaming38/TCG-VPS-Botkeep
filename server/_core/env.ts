export const ENV = {
  appId: process.env.VITE_APP_ID ?? "tcg-manager-selfhost",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Self-host (Oracle VPS free): single-admin login, no Manus OAuth needed.
  adminEmail: process.env.ADMIN_EMAIL ?? "admin@local",
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
  adminOpenId: process.env.ADMIN_OPENID ?? "local-admin",
  cronSecret: process.env.CRON_SECRET ?? "",
  storageDir: process.env.STORAGE_DIR ?? "./dist/public/uploads",
};
