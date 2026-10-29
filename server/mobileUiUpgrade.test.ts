import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Mobile UI upgrade (approved from previews on 2026-10-30): a floating
 * glass bottom tab bar on phones + skeleton loading screens instead of
 * spinners/zero-filled pages. These are wiring guards: the tab bar must
 * keep its five approved destinations, the layout must feed it the real
 * unread-Chyusen count, and the main pages must render their skeletons
 * while their first data load is pending.
 */
function readClientFile(path: string): string {
  return readFileSync(new URL(`../client/src/${path}`, import.meta.url), "utf8");
}

describe("Mobile bottom tab bar", () => {
  const tabBar = readClientFile("components/MobileTabBar.tsx");

  it("links the five approved destinations", () => {
    for (const path of ["/thong-ke", "/kho-hang", "/ban-hang", "/mua-hang", "/chyusen"]) {
      expect(tabBar).toContain(`path: "${path}"`);
    }
  });

  it("shows a red dot on Chyusen only when there are unread notifications", () => {
    expect(tabBar).toContain('item.path === "/chyusen" && chyusenUnreadCount > 0');
    expect(tabBar).toContain("bg-red-500");
  });

  it("highlights the active tab with the sky glass pill and hides on desktop", () => {
    expect(tabBar).toContain("bg-sky-400/15 text-sky-300");
    expect(tabBar).toContain("md:hidden");
  });

  it("is mounted by the layout with the layout's unread Chyusen count", () => {
    const layout = readClientFile("components/DashboardLayout.tsx");
    expect(layout).toContain("<MobileTabBar chyusenUnreadCount={unreadChyusenCount} />");
    expect(layout).toContain("isMobile && <MobileTabBar");
  });

  it("reserves bottom space on mobile so content is not hidden behind the bar", () => {
    const layout = readClientFile("components/DashboardLayout.tsx");
    expect(layout).toContain("pb-28");
  });
});

describe("Skeleton loading screens", () => {
  it("page skeletons exist and are built from the shared Skeleton primitive", () => {
    const skeletons = readClientFile("components/PageSkeletons.tsx");
    expect(skeletons).toContain("export function DashboardSkeleton()");
    expect(skeletons).toContain("export function ProductListSkeleton(");
    expect(skeletons).toContain("export function GenericPageSkeleton()");
    expect(skeletons).toContain('from "@/components/ui/skeleton"');
  });

  it("dashboard shows its skeleton until stats arrive", () => {
    const dashboard = readClientFile("pages/Dashboard.tsx");
    expect(dashboard).toContain("if (!stats) return <DashboardSkeleton />;");
  });

  it("inventory shows the list skeleton while the first load is pending", () => {
    const inventory = readClientFile("pages/Inventory.tsx");
    expect(inventory).toContain("!products ? (");
    expect(inventory).toContain("<ProductListSkeleton />");
  });

  it("product category pages show the list skeleton while loading", () => {
    const products = readClientFile("pages/Products.tsx");
    expect(products).toContain("products === undefined ? (");
    expect(products).toContain("<ProductListSkeleton />");
  });

  it("route transitions use the generic skeleton instead of a spinner", () => {
    const app = readClientFile("App.tsx");
    expect(app).toContain("return <GenericPageSkeleton />;");
    expect(app).not.toContain("animate-spin");
  });
});
