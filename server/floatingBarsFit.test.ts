import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

function readClientFile(path: string): string {
  return readFileSync(new URL(`../client/src/${path}`, import.meta.url), "utf8");
}

const css = readClientFile("index.css");
const layout = readClientFile("components/DashboardLayout.tsx");
const tabBar = readClientFile("components/MobileTabBar.tsx");

describe("floating bars fit every phone frame", () => {
  it("topbar wrapper uses the shared inset hook instead of the old 12px padding", () => {
    expect(layout).toContain("app-topbar-wrap sticky top-0 z-40");
    expect(layout).not.toContain("sticky top-0 z-40 px-3");
  });

  it("tab bar no longer hard-codes the old 12px inset", () => {
    expect(tabBar).toContain("mobile-tabbar fixed");
    expect(tabBar).not.toContain("inset-x-3");
  });

  it("both bars share the content column inset (16px) with notch safe areas", () => {
    expect(css).toContain(".app-topbar-wrap {");
    expect(css).toContain(".mobile-tabbar {");
    const leftRules = css.split("max(1rem, env(safe-area-inset-left, 0px))").length - 1;
    const rightRules = css.split("max(1rem, env(safe-area-inset-right, 0px))").length - 1;
    expect(leftRules).toBeGreaterThanOrEqual(2);
    expect(rightRules).toBeGreaterThanOrEqual(2);
  });

  it("topbar inset grows to the desktop value at the md breakpoint", () => {
    expect(css).toContain("@media (min-width: 768px)");
    expect(css).toContain("padding-left: 1.25rem");
  });

  it("content column keeps the 16px reference inset the bars now match", () => {
    expect(layout).toContain('<main className="flex-1 px-4');
  });

  it("page can never be stretched sideways past the phone frame", () => {
    expect(css).toContain("overflow-x: clip");
  });
});

describe("content never peeks out from behind the floating bars", () => {
  it("topbar strip is a frosted band, not a transparent gap above the pill", () => {
    expect(layout).toContain("app-topbar-wrap sticky top-0 z-40 bg-background/75");
    expect(layout).toContain("backdrop-blur-xl backdrop-saturate-150");
  });

  it("a frosted band sits behind the mobile tab bar down to the screen edge", () => {
    expect(layout).toContain("mobile-tabbar-band pointer-events-none fixed inset-x-0 bottom-0 z-30");
    expect(layout).toContain("h-[calc(env(safe-area-inset-bottom,0px)+84px)]");
  });

  it("the bottom band renders only on mobile, like the tab bar itself", () => {
    const bandLine = layout.split("\n").find((line) => line.includes("mobile-tabbar-band"));
    expect(bandLine).toContain("md:hidden");
    expect(bandLine).toContain("isMobile");
  });
});
