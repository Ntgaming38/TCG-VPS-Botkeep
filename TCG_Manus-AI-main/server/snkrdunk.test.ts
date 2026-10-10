import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSnkrdunkPrice, isValidSnkrdunkUrl, parseFirstRankAPrice, parseSnkrdunkPrice } from "./snkrdunk";

describe("SNKRDUNK adapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses a JPY price from JSON-LD", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      offers: { priceCurrency: "JPY", price: "13,300" },
    })}</script>`;
    expect(parseSnkrdunkPrice(html)).toBe(13300);
  });

  it("parses the first choice price from visible markup", () => {
    expect(parseSnkrdunkPrice("<div>1個 (99+) ¥13,300~</div>")).toBe(13300);
  });

  it("chooses the first visible option before later quantities", () => {
    expect(parseSnkrdunkPrice("<div>1個 (99+) ¥13,300~</div><div>2個 (99+) ¥28,000~</div>")).toBe(13300);
  });

  it("chooses the first JPY JSON offer before later offers", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      offers: [
        { priceCurrency: "JPY", price: "13,300" },
        { priceCurrency: "JPY", price: "28,000" },
      ],
    })}</script>`;
    expect(parseSnkrdunkPrice(html)).toBe(13300);
  });

  it("selects the first Rank A price and ignores B prices", () => {
    const html = `<button><p>B</p><p><span>¥</span>1,200</p></button><button><p>A</p><p><span>¥</span>1,600<!-- -->~</p></button><button><p>PSA 10</p><p><span>¥</span>8,000</p></button>`;
    expect(parseFirstRankAPrice(html)).toBe(1600);
  });

  it("recognizes the Japanese Aあり label", () => {
    expect(parseFirstRankAPrice(`<button><p>Aあり</p><p>¥1,600~</p></button>`)).toBe(1600);
  });

  it("does not create a price when the page has no public price", () => {
    expect(parseSnkrdunkPrice("<div>Loading...</div>")).toBeNull();
  });

  it("ignores a non-JPY JSON price", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      offers: { priceCurrency: "USD", price: "84" },
    })}</script>`;
    expect(parseSnkrdunkPrice(html)).toBeNull();
  });

  it("reads the first JPY choice from the official sizes API", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '<script>{"productCode":"SW---721913"}</script>',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          sizes: [
            { currency: "JPY", price: 13300, size: { text: "1 box" } },
            { currency: "JPY", price: 28000, size: { text: "2 boxes" } },
          ],
        }),
      } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchSnkrdunkPrice("https://snkrdunk.com/en/trading-cards/721913"))
      .resolves.toMatchObject({ price: 13300 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falls back to the Japanese product page when the English API is USD-only", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '<script>{"productCode":"SW---721913"}</script>',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          sizes: [{ currency: "USD", price: 84, size: { text: "1 box" } }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'quantity_1\\",\\"minNewListingPrice\\":13300,quantity_2\\",\\"minNewListingPrice\\":28000',
      } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchSnkrdunkPrice("https://snkrdunk.com/en/trading-cards/721913"))
      .resolves.toMatchObject({ price: 13300 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not convert a USD first choice into JPY", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '<script>{"productCode":"SW---721913"}</script>',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          sizes: [{ currency: "USD", price: 84, size: { text: "1 box" } }],
        }),
      } as Response)
      .mockResolvedValueOnce({ ok: false, status: 404 } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchSnkrdunkPrice("https://snkrdunk.com/en/trading-cards/721913"))
      .rejects.toThrow("USD");
  });

  it("uses Rank A from the Japanese Card page instead of the first B listing", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '<script>{"productCode":"SW---868598"}</script>',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '<button><p>B</p><p>¥1,200~</p></button><button><p>A</p><p>¥1,600~</p></button>',
      } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchSnkrdunkPrice("https://snkrdunk.com/en/trading-cards/868598/used", "card"))
      .resolves.toMatchObject({ price: 1600 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("accepts a specific HTTPS product URL", () => {
    expect(isValidSnkrdunkUrl("https://snkrdunk.com/en/trading-cards/example")).toBe(true);
    expect(isValidSnkrdunkUrl("https://www.snkrdunk.com/en/trading-cards/example")).toBe(true);
  });

  it("rejects category URLs and non-SNKRDUNK URLs", () => {
    expect(isValidSnkrdunkUrl("https://snkrdunk.com/categories/6")).toBe(false);
    expect(isValidSnkrdunkUrl("http://snkrdunk.com/en/trading-cards/example")).toBe(false);
    expect(isValidSnkrdunkUrl("https://example.com/product")).toBe(false);
  });
});
