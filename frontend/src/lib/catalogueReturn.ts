/** Where the visitor left the catalogue for a vehicle page (filters, scroll and revealed batch), so the way back
    lands on the same card. Kept in memory on purpose: a reload starts the catalogue at the top. */
export interface CatalogueReturn {
  search: string;
  scrollY: number;
  count: number;
}

let point: CatalogueReturn | null = null;

export function rememberCatalogue(next: CatalogueReturn): void {
  point = next;
}

export function catalogueReturn(): CatalogueReturn | null {
  return point;
}
