export function calculateTax(subtotalCents: number, vatRate: number): number {
  return Math.round(subtotalCents * vatRate);
}
