-- PurchaseOrder.journalEntryId becomes optional: new orders no longer post
-- accounting on their own. Existing rows keep their historical link.
ALTER TABLE "PurchaseOrder" ALTER COLUMN "journalEntryId" DROP NOT NULL;

-- Track how much of each ordered line has actually been received.
-- Existing lines were fully stocked immediately under the old flow, so
-- backfill them as fully received.
ALTER TABLE "PurchaseOrderLine" ADD COLUMN "receivedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0;
UPDATE "PurchaseOrderLine" SET "receivedQuantity" = "quantity";

CREATE TABLE "PurchaseReceipt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "journalEntryId" TEXT NOT NULL,

    CONSTRAINT "PurchaseReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PurchaseReceipt_journalEntryId_key" ON "PurchaseReceipt"("journalEntryId");

CREATE TABLE "PurchaseReceiptLine" (
    "id" TEXT NOT NULL,
    "purchaseReceiptId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitCostCents" INTEGER NOT NULL,

    CONSTRAINT "PurchaseReceiptLine_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseReceiptLine" ADD CONSTRAINT "PurchaseReceiptLine_purchaseReceiptId_fkey" FOREIGN KEY ("purchaseReceiptId") REFERENCES "PurchaseReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceiptLine" ADD CONSTRAINT "PurchaseReceiptLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
