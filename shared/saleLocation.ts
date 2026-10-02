export type SaleLocationOption = { id: number; name: string };

export type SaleLocationSelection = {
  platform: string;
  saleLocation: string | null;
};

export function getSaleLocationSelectValue(platform: string, saleLocation: string | null | undefined, locations: SaleLocationOption[]) {
  if (saleLocation) {
    const matched = locations.find((location) => location.name === saleLocation);
    if (matched) return `location:${matched.id}`;
  }
  return `platform:${platform}`;
}

export function resolveSaleLocationSelection(value: string, locations: SaleLocationOption[]): SaleLocationSelection {
  if (value.startsWith("location:")) {
    const locationId = Number(value.slice("location:".length));
    const matched = locations.find((location) => location.id === locationId);
    return { platform: "shop", saleLocation: matched?.name || null };
  }

  return { platform: value.replace("platform:", ""), saleLocation: null };
}
