import { describe, expect, it } from "vitest";
import { DEFAULT_TRASH_FILTER_PREFERENCES, parseTrashFilterPreferences } from "../shared/trashFilterPreferences";

describe("trash filter preferences", () => {
  it("returns defaults for empty or malformed saved values", () => {
    expect(parseTrashFilterPreferences(null)).toEqual(DEFAULT_TRASH_FILTER_PREFERENCES);
    expect(parseTrashFilterPreferences("not-json")).toEqual(DEFAULT_TRASH_FILTER_PREFERENCES);
  });

  it("keeps only valid stored filter fields", () => {
    expect(parseTrashFilterPreferences(JSON.stringify({ filter: "product", search: "Pikachu", deletedDate: "2026-08-14", quickPeriod: "month" }))).toEqual({ filter: "product", search: "Pikachu", deletedDate: "2026-08-14", quickPeriod: "month" });
    expect(parseTrashFilterPreferences(JSON.stringify({ filter: "unknown", search: 99, deletedDate: "today", quickPeriod: "year" }))).toEqual(DEFAULT_TRASH_FILTER_PREFERENCES);
  });
});
