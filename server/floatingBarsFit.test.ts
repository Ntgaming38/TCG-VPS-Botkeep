import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

function readClientFile(path: string): string {
  return readFileSync(new URL(`../client/src/${path}`, import.meta.url), "utf8");
}

const css = readClientFile("index.css");
const layout = readClientFile("components/DashboardLayout.tsx");
const tabBar = readClientFile("components/MobileTabBar.tsx");

function lineWith(source: string, marker: string): string {
  return source.split("\n").find((line) => line.includes(marker)) ?? "";
}

describe("top and bottom bars sit flush with the phone screen edges", () => {
  it("topbar is a single docked strip stuck to the top edge, not a floating pill", () => {
    const barLine = lineWith(layout, "app-topbar sticky top-0 z-40");
    expect(barLine).toContain("border-b");
    expect(barLine).not.toContain("rounded-2xl");
    expect(layout).not.toContain("app-topbar-wrap");
  });

  it("tab bar is docked to the bottom edge, full width, no floating gap or rounding", () => {
    expect(tabBar).toContain("mobile-tabbar fixed inset-x-0 bottom-0");
    expect(tabBar).toContain("border-t");
    expect(tabBar).not.toContain("rounded-[22px]");
    expect(tabBar).not.toContain("bottom-[calc");
  });

  it("no frosted band or other overlay strip is left behind either bar", () => {
    expect(layout).not.toContain("mobile-tabbar-band");
  });

  it("topbar content clears the status bar by the safe area plus a breathing gap", () => {
    expect(css).toContain("padding-top: calc(env(safe-area-inset-top, 0px) + 0.625rem)");
  });

  it("standalone (home-screen) mode floors the top inset at the Dynamic Island status height", () => {
    expect(css).toContain("@media (display-mode: standalone)");
    expect(css).toContain("padding-top: calc(max(env(safe-area-inset-top, 0px), 59px) + 0.625rem)");
  });

  it("bar padding respects the notch safe areas, and the tab bar clears the home indicator", () => {
    expect(css).toContain(".app-topbar {");
    expect(css).toContain(".mobile-tabbar {");
    expect(css).toContain("max(1rem, env(safe-area-inset-left, 0px))");
    expect(css).toContain("max(0.5rem, env(safe-area-inset-left, 0px))");
    expect(css).toContain("padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 6px)");
  });

  it("topbar horizontal padding grows to match the desktop content padding", () => {
    expect(css).toContain("padding-left: 1.5rem");
    expect(layout).toContain('<main className="flex-1 px-4 pb-28 pt-4 md:p-6">');
  });

  it("page can never be stretched sideways past the phone frame", () => {
    expect(css).toContain("overflow-x: clip");
  });
});
