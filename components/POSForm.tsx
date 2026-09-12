"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createOrder, type ActionState } from "@/lib/actions/pos";
import { VAT_RATE } from "@/lib/tax";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const initialState: ActionState = {};
const inputClass =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

type Item = { id: string; name: string; priceCents: number };

const ORDER_TYPES: { value: string; label: string }[] = [
  { value: "DINE_IN", label: "Dine-in" },
  { value: "TAKEAWAY", label: "Takeaway" },
  { value: "DELIVERY", label: "Delivery" },
];

const CUTLERY_OPTIONS = ["Fork", "Knife", "Spoon", "Napkins"];

function formatCents(cents: number, currency: string): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency });
}

export default function POSForm({
  items: catalogItems,
  customerNames,
  currency,
}: {
  items: Item[];
  customerNames: string[];
  currency: string;
}) {
  const [state, formAction, pending] = useActionState(
    createOrder,
    initialState
  );
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orderType, setOrderType] = useState("DINE_IN");
  const [cutlery, setCutlery] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!state?.error) {
      setCart({});
      setOrderType("DINE_IN");
      setCutlery([]);
      formRef.current?.reset();
    }
  }, [state]);

  function toggleCutlery(item: string) {
    setCutlery((c) =>
      c.includes(item) ? c.filter((i) => i !== item) : [...c, item]
    );
  }

  function addItem(id: string) {
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  }

  function setQty(id: string, qty: number) {
    setCart((c) => {
      if (qty <= 0) {
        const next = { ...c };
        delete next[id];
        return next;
      }
      return { ...c, [id]: qty };
    });
  }

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => {
          const item = catalogItems.find((p) => p.id === id);
          return item ? { item, qty } : null;
        })
        .filter((l): l is { item: Item; qty: number } => l !== null),
    [cart, catalogItems]
  );

  const subtotal = lines.reduce((s, l) => s + l.item.priceCents * l.qty, 0);
  const tax = Math.round(subtotal * VAT_RATE);
  const total = subtotal + tax;

  return (
    <form ref={formRef} action={formAction} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        <Card className="p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Customer name
              <input
                name="customerName"
                required
                list="customer-names"
                placeholder="e.g. Nadine Haddad"
                className={inputClass}
              />
              <datalist id="customer-names">
                {customerNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </label>
            <div className="flex flex-col gap-1.5 text-sm font-medium">
              Order type
              <div className="flex gap-2">
                {ORDER_TYPES.map((t) => (
                  <label
                    key={t.value}
                    className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors ${
                      orderType === t.value
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-border text-muted hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="orderType"
                      value={t.value}
                      checked={orderType === t.value}
                      onChange={() => setOrderType(t.value)}
                      className="sr-only"
                    />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {orderType !== "DINE_IN" && (
            <div className="mt-4 flex flex-col gap-1.5 border-t border-border pt-4 text-sm font-medium">
              Cutlery
              <div className="flex flex-wrap gap-2">
                {CUTLERY_OPTIONS.map((item) => {
                  const selected = cutlery.includes(item);
                  return (
                    <label
                      key={item}
                      className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                        selected
                          ? "border-accent bg-accent-soft text-accent"
                          : "border-border text-muted hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleCutlery(item)}
                        className="sr-only"
                      />
                      {item}
                    </label>
                  );
                })}
              </div>
              {cutlery.map((item) => (
                <input key={item} type="hidden" name="cutlery" value={item} />
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Menu</h2>
          {catalogItems.length === 0 ? (
            <p className="text-sm text-muted">
              No items yet — add some on the Items page first.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {catalogItems.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addItem(p.id)}
                  className="flex flex-col items-start gap-1 rounded-lg border border-border px-4 py-3 text-left hover:border-accent hover:bg-accent-soft"
                >
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-muted">
                    {formatCents(p.priceCents, currency)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="flex h-fit flex-col gap-4 p-5">
        <h2 className="font-semibold">Order</h2>
        {lines.length === 0 ? (
          <p className="text-sm text-muted">Tap menu items to add them.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {lines.map(({ item, qty }) => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="quantity" value={qty} />
                <span className="flex-1">{item.name}</span>
                <button
                  type="button"
                  onClick={() => setQty(item.id, qty - 1)}
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted hover:bg-slate-50"
                >
                  −
                </button>
                <span className="w-5 text-center tabular-nums">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty(item.id, qty + 1)}
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted hover:bg-slate-50"
                >
                  +
                </button>
                <span className="w-16 text-right tabular-nums">
                  {formatCents(item.priceCents * qty, currency)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between text-muted">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatCents(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>VAT ({Math.round(VAT_RATE * 100)}%)</span>
            <span className="tabular-nums">{formatCents(tax, currency)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatCents(total, currency)}</span>
          </div>
        </div>

        {state?.error && <p className="text-sm text-danger">{state.error}</p>}

        <Button type="submit" disabled={pending || lines.length === 0} className="w-full">
          {pending ? "Placing order…" : "Complete order"}
        </Button>
      </Card>
    </form>
  );
}
