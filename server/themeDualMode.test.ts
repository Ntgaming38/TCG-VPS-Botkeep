import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Dual light/dark theme (approved from the Rainmaker dashboard demo on
 * 2026-11-10): the whole app gets a light-glass theme alongside the
 * existing dark charcoal theme. Guards: the app must default to light,
 * the choice must persist via localStorage "theme", the pre-paint script
 * must apply the class before first render, a toggle must live in the
 * top bar, the light token block + key glass overrides must exist in
 * index.css, deliberately-dark regions must opt out via .keep-dark, and
 * the dashboard charts must pick their strokes from the active theme.
 */
function readClientFile(path: string): string {
  return readFileSync(new URL(`../client/src/${path}`, import.meta.url), "utf8");
}

describe("Dual theme wiring", () => {
  it("defaults the app to the light theme", () => {
    const app = readClientFile("App.tsx");
    expect(app).toContain('<ThemeProvider defaultTheme="light" switchable>');
  });

  it("manages both html classes and persists the choice", () => {
    const ctx = readClientFile("contexts/ThemeContext.tsx");
    expect(ctx).toContain('root.classList.toggle("dark", theme === "dark")');
    expect(ctx).toContain('root.classList.toggle("light", theme === "light")');
    expect(ctx).toContain('localStorage.getItem("theme")');
    expect(ctx).toContain('localStorage.setItem("theme", theme)');
    expect(ctx).toContain('stored === "light" || stored === "dark"');
  });

  it("applies the stored theme before first paint", () => {
    const html = readFileSync(new URL("../client/index.html", import.meta.url), "utf8");
    expect(html).toContain('localStorage.getItem("theme")');
    expect(html).toContain('classList.add(t)');
  });

  it("puts a working toggle in the top bar", () => {
    const layout = readClientFile("components/DashboardLayout.tsx");
    expect(layout).toContain("useTheme");
    expect(layout).toContain("onClick={toggleTheme}");
    expect(layout).toContain("app-topbar");
    expect(layout).toContain("sidebar-collapse-btn");
  });
});

describe("Light glass theme in index.css", () => {
  const css = readClientFile("index.css");

  it("defines the light token palette without touching the dark one", () => {
    expect(css).toContain(":root.light");
    expect(css).toContain("--background: oklch(0.945 0.014 252)");
    expect(css).toContain("--card: oklch(1 0 0 / 0.72)");
    // The charcoal block that powers the dark theme stays in place.
    expect(css).toContain("Charcoal theme derived from the supplied solid-color reference");
  });

  it("restyles the glass chrome for light", () => {
    expect(css).toContain('html.light [data-variant="floating"] [data-slot="sidebar-inner"]');
    expect(css).toContain("html.light .glass-active-item");
    expect(css).toContain("html.light .mobile-tabbar");
    expect(css).toContain("html.light .ambient-glow");
  });

  it("covers the opacity variants and the dark 950 tint panels (contrast fix round 2)", () => {
    expect(css).toContain("html.light .bg-red-950\\/70");
    expect(css).toContain("html.light .bg-violet-950\\/40");
    expect(css).toContain("html.light .text-violet-200\\/85");
    expect(css).toContain("html.light .text-violet-200\\/70");
  });

  it("deepens pale tint text on light surfaces but restores it inside .keep-dark", () => {
    expect(css).toContain("html.light .text-teal-300, html.light .text-teal-400 { color: #0D9488; }");
    expect(css).toContain("html.light .keep-dark .text-teal-300 { color: #5EEAD4; }");
    expect(css).toContain("html.light .text-slate-300 { color: #64748B; }");
    expect(css).toContain("html.light .keep-dark .text-slate-300 { color: #CBD5E1; }");
  });
});

describe("Theme-aware surfaces", () => {
  it("dashboard charts follow the active theme", () => {
    const dash = readClientFile("pages/Dashboard.tsx");
    expect(dash).toContain("useTheme");
    expect(dash).toContain("chartGridStroke");
    expect(dash).toContain("rgba(15,35,70,0.08)");
    expect(dash).toContain("chartTooltipStyle");
  });

  it("mobile tab bar carries the hook class for the light override", () => {
    const tabBar = readClientFile("components/MobileTabBar.tsx");
    expect(tabBar).toContain("mobile-tabbar");
    expect(tabBar).toContain("tab-dot");
  });

  it("deliberately dark regions opt out of the light remap", () => {
    for (const page of ["pages/Welcome.tsx", "pages/Login.tsx", "pages/ChooseFranchise.tsx", "pages/FranchiseIntro.tsx", "pages/Home.tsx", "pages/SnkrShop.tsx"]) {
      expect(readClientFile(page)).toContain("keep-dark");
    }
  });
});
