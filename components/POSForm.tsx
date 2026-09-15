"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createOrder, type ActionState } from "@/lib/actions/pos";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const initialState: ActionState = {};
const inputClass =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

type Item = {
  id: string;
  name: string;
  priceCents: number;
  category: string;
  defaultMilkItemId?: string;
};
type MilkOption = { id: string; name: string };
type CartLine = { qty: number; milkItemId?: string };

const ORDER_TYPES: { value: string; label: string }[] = [
  { value: "DINE_IN", label: "Dine-in" },
  { value: "TAKEAWAY", label: "Takeaway" },
  { value: "DELIVERY", label: "Delivery" },
];

const CUTLERY_OPTIONS = ["Fork", "Knife", "Spoon", "Napkins"];

const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: "ON_ACCOUNT", label: "On account" },
  { value: "WHISH", label: "Whish" },
];

function formatCents(cents: number, currency: string): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency });
}

export default function POSForm({
  items: catalogItems,
  milkOptions,
  customerNames,
  currency,
  vatRate,
}: {
  items: Item[];
  milkOptions: MilkOption[];
  customerNames: string[];
  currency: string;
  vatRate: number;
}) {
  const [state, formAction, pending] = useActionState(
    createOrder,
    initialState
  );
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [orderType, setOrderType] = useState("DINE_IN");
  const [paymentMethod, setPaymentMethod] = useState("ON_ACCOUNT");
  const [discountPercent, setDiscountPercent] = useState(0);
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
      setPaymentMethod("ON_ACCOUNT");
      setDiscountPercent(0);
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
    setCart((c) => ({
      ...c,
      [id]: {
        qty: (c[id]?.qty || 0) + 1,
        milkItemId:
          c[id]?.milkItemId ??
          catalogItems.find((p) => p.id === id)?.defaultMilkItemId,
      },
    }));
  }

  function setQty(id: string, qty: number) {
    setCart((c) => {
      if (qty <= 0) {
        const next = { ...c };
        delete next[id];
        return next;
      }
      return { ...c, [id]: { ...c[id], qty } };
    });
  }

  function setMilk(id: string, milkItemId: string) {
    setCart((c) => ({ ...c, [id]: { ...c[id], milkItemId } }));
  }

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, line]) => {
          const item = catalogItems.find((p) => p.id === id);
          return item ? { item, qty: line.qty, milkItemId: line.milkItemId } : null;
        })
        .filter(
          (l): l is { item: Item; qty: number; milkItemId: string | undefined } =>
            l !== null
        ),
    [cart, catalogItems]
  );

  const itemsByCategory = useMemo(() => {
    const groups = new Map<string, Item[]>();
    for (const item of catalogItems) {
      if (!groups.has(item.category)) groups.set(item.category, []);
      groups.get(item.category)!.push(item);
    }
    return Array.from(groups.entries());
  }, [catalogItems]);
  const [activeCategory, setActiveCategory] = useState(
    () => itemsByCategory[0]?.[0] ?? ""
  );
  const activeItems =
    itemsByCategory.find(([category]) => category === activeCategory)?.[1] ??
    [];

  const grossSubtotal = lines.reduce((s, l) => s + l.item.priceCents * l.qty, 0);
  const discount = Math.round((grossSubtotal * discountPercent) / 100);
  const subtotal = grossSubtotal - discount;
  const tax = Math.round(subtotal * vatRate);
  const total = subtotal + tax;

  return (
    <form ref={formRef} action={formAction} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        <Card className="p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium">
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
            <div className="flex min-w-0 flex-col gap-1.5 text-sm font-medium">
              Order type
              <div className="flex flex-wrap gap-2">
                {ORDER_TYPES.map((t) => (
                  <label
                    key={t.value}
                    className={`cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors ${
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
            <div className="flex min-w-0 flex-col gap-1.5 text-sm font-medium">
              Payment method
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <label
                    key={m.value}
                    className={`cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors ${
                      paymentMethod === m.value
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-border text-muted hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={m.value}
                      checked={paymentMethod === m.value}
                      onChange={() => setPaymentMethod(m.value)}
                      className="sr-only"
                    />
                    {m.label}
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
            <>
              <div className="mb-4 flex flex-wrap gap-2 border-b border-border pb-4">
                {itemsByCategory.map(([category]) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      activeCategory === category
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-border text-muted hover:border-accent hover:text-accent"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {activeItems.map((p) => (
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
            </>
          )}
        </Card>
      </div>

      <Card className="flex h-fit flex-col gap-4 p-5">
        <h2 className="font-semibold">Order</h2>
        {lines.length === 0 ? (
          <p className="text-sm text-muted">Tap menu items to add them.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {lines.map(({ item, qty, milkItemId }) => (
              <div key={item.id} className="flex flex-col gap-1.5">
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="quantity" value={qty} />
                <input
                  type="hidden"
                  name="milkItemId"
                  value={milkItemId ?? ""}
                />
                <div className="flex items-center gap-2 text-sm">
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
                {item.defaultMilkItemId && (
                  <select
                    value={milkItemId ?? item.defaultMilkItemId}
                    onChange={(e) => setMilk(item.id, e.target.value)}
                    className="w-fit rounded-md border border-border bg-transparent px-2 py-1 text-xs text-muted outline-none focus:border-accent"
                  >
                    {milkOptions.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        )}

        <label className="flex items-center justify-between gap-3 text-sm font-medium">
          Discount %
          <input
            name="discountPercent"
            type="number"
            min="0"
            max="100"
            step="1"
            value={discountPercent || ""}
            onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
            placeholder="0"
            className={`w-20 text-right ${inputClass}`}
          />
        </label>

        <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between text-muted">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatCents(grossSubtotal, currency)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-muted">
              <span>Discount ({discountPercent}%)</span>
              <span className="tabular-nums">−{formatCents(discount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-muted">
            <span>VAT ({Math.round(vatRate * 100)}%)</span>
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
