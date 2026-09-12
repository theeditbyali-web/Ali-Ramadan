// Lebanon's standard VAT (TVA) rate. This has changed over time — confirm
// the current rate with an accountant before relying on it for real sales.
export const VAT_RATE = 0.11;

export function calculateTax(subtotalCents: number): number {
  return Math.round(subtotalCents * VAT_RATE);
}
