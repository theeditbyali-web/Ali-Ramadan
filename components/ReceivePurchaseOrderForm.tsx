"use client";

import { useActionState } from "react";
import { receivePurchaseOrder, type ActionState } from "@/lib/actions/purchases";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const initialState: ActionState = {};
const inputClass =
  "w-28 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

type Line = {
  id: string;
  itemName: string;
  unit: string;
  quantity: number;
  receivedQuantity: number;
};

export default function ReceivePurchaseOrderForm({
  purchaseOrderId,
  lines,
}: {
  purchaseOrderId: string;
  lines: Line[];
}) {
  const [state, formAction, pending] = useActionState(receivePurchaseOrder, initialState);
  const pending_lines = lines.filter((l) => l.receivedQuantity < l.quantity);

  if (pending_lines.length === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      <h2 className="mb-4 font-semibold">Receive stock</h2>
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="purchaseOrderId" value={purchaseOrderId} />
        <div className="flex flex-col gap-3">
          {pending_lines.map((line) => {
            const remaining = line.quantity - line.receivedQuantity;
            return (
              <div key={line.id} className="flex items-center gap-3 text-sm">
                <input type="hidden" name="lineId" value={line.id} />
                <span className="flex-1">{line.itemName}</span>
                <span className="w-40 text-right text-muted">
                  {remaining} {line.unit} remaining
                </span>
                <input
                  name="receiveQuantity"
                  type="number"
                  step="0.001"
                  min="0"
                  max={remaining}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
            );
          })}
        </div>

        {state?.error && <p className="text-sm text-danger">{state.error}</p>}

        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Recording…" : "Record receipt"}
        </Button>
      </form>
    </Card>
  );
}
