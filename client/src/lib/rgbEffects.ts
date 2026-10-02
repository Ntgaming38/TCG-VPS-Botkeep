export const RGB_EFFECTS_STORAGE_KEY = "tcg-rgb-effects-enabled";
export const RGB_EFFECTS_SPEED_STORAGE_KEY = "tcg-rgb-effects-speed";
export const RGB_EFFECTS_COLORS_STORAGE_KEY = "tcg-rgb-effects-colors";
export const DEFAULT_RGB_EFFECTS_ENABLED = true;

export const RGB_EFFECT_SPEEDS = ["slow", "normal", "fast"] as const;
export type RgbEffectSpeed = (typeof RGB_EFFECT_SPEEDS)[number];
export const DEFAULT_RGB_EFFECTS_SPEED: RgbEffectSpeed = "normal";

export type RgbEffectColors = [string, string, string, string];
export const DEFAULT_RGB_EFFECT_COLORS: RgbEffectColors = ["#FFCB05", "#FF4D6D", "#42B9FF", "#44E28D"];

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value);
}

function isValidRgbEffectColors(value: unknown): value is RgbEffectColors {
  return Array.isArray(value) && value.length === 4 && value.every(isValidHexColor);
}

export function createRgbGradient(colors: RgbEffectColors) {
  const [first, second, third, fourth] = colors;
  return `linear-gradient(90deg, ${first} 0%, ${second} 30%, ${third} 60%, ${fourth} 82%, ${first} 100%)`;
}

export function readRgbEffectsEnabled(storage?: StorageLike) {
  return storage?.getItem(RGB_EFFECTS_STORAGE_KEY) !== "false" ? DEFAULT_RGB_EFFECTS_ENABLED : false;
}

export function readRgbEffectsSpeed(storage?: StorageLike): RgbEffectSpeed {
  const stored = storage?.getItem(RGB_EFFECTS_SPEED_STORAGE_KEY);
  return RGB_EFFECT_SPEEDS.includes(stored as RgbEffectSpeed) ? stored as RgbEffectSpeed : DEFAULT_RGB_EFFECTS_SPEED;
}

export function readRgbEffectsColors(storage?: StorageLike): RgbEffectColors {
  try {
    const parsed = JSON.parse(storage?.getItem(RGB_EFFECTS_COLORS_STORAGE_KEY) || "null");
    return isValidRgbEffectColors(parsed) ? parsed : DEFAULT_RGB_EFFECT_COLORS;
  } catch {
    return DEFAULT_RGB_EFFECT_COLORS;
  }
}

export function applyRgbEffectsEnabled(enabled: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.rgbEffects = enabled ? "enabled" : "disabled";
}

export function applyRgbEffectsSpeed(speed: RgbEffectSpeed) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.rgbSpeed = speed;
}

export function applyRgbEffectsColors(colors: RgbEffectColors) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--tcg-rgb-gradient", createRgbGradient(colors));
}

export function saveRgbEffectsEnabled(enabled: boolean, storage?: StorageLike) {
  storage?.setItem(RGB_EFFECTS_STORAGE_KEY, String(enabled));
  applyRgbEffectsEnabled(enabled);
}

export function saveRgbEffectsSpeed(speed: RgbEffectSpeed, storage?: StorageLike) {
  storage?.setItem(RGB_EFFECTS_SPEED_STORAGE_KEY, speed);
  applyRgbEffectsSpeed(speed);
}

export function saveRgbEffectsColors(colors: RgbEffectColors, storage?: StorageLike) {
  storage?.setItem(RGB_EFFECTS_COLORS_STORAGE_KEY, JSON.stringify(colors));
  applyRgbEffectsColors(colors);
}

export function initializeRgbEffects() {
  if (typeof window === "undefined") return;
  applyRgbEffectsEnabled(readRgbEffectsEnabled(window.localStorage));
  applyRgbEffectsSpeed(readRgbEffectsSpeed(window.localStorage));
  applyRgbEffectsColors(readRgbEffectsColors(window.localStorage));
}
