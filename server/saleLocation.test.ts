import { describe, expect, it } from "vitest";
import { getSaleLocationSelectValue, resolveSaleLocationSelection } from "../shared/saleLocation";

const locations = [{ id: 3, name: "Khách quen" }, { id: 8, name: "Sự kiện Osaka" }];

describe("sale location selection", () => {
  it("resolves a custom location as the shop platform while preserving its name", () => {
    expect(resolveSaleLocationSelection("location:8", locations)).toEqual({ platform: "shop", saleLocation: "Sự kiện Osaka" });
  });

  it("keeps built-in platforms without a custom location", () => {
    expect(resolveSaleLocationSelection("platform:user", locations)).toEqual({ platform: "user", saleLocation: null });
    expect(getSaleLocationSelectValue("shop", "Khách quen", locations)).toBe("location:3");
  });
});
