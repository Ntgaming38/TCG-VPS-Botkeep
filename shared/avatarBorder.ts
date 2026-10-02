export const AVATAR_BORDER_PRESETS = [
  { value: "#22c55e", label: "Xanh lá" },
  { value: "#22d3ee", label: "Cyan" },
  { value: "#a855f7", label: "Tím" },
  { value: "#f59e0b", label: "Vàng" },
  { value: "#ef4444", label: "Đỏ" },
  { value: "#f8fafc", label: "Trắng" },
] as const;

export function normalizeAvatarBorderColor(value?: string | null) {
  return AVATAR_BORDER_PRESETS.some((preset) => preset.value === value) ? value! : AVATAR_BORDER_PRESETS[0].value;
}
