import { describe, expect, it } from "vitest";
import { buttonVariants } from "../client/src/components/ui/button";

describe("button interaction feedback", () => {
  it("cung cấp phản hồi hover và nhấn cho các nút thao tác", () => {
    const classes = buttonVariants({ variant: "ghost", size: "sm" });

    expect(classes).toContain("motion-safe:hover:-translate-y-px");
    expect(classes).toContain("active:scale-[0.97]");
    expect(classes).toContain("active:brightness-110");
    expect(classes).toContain("touch-manipulation");
  });
});
