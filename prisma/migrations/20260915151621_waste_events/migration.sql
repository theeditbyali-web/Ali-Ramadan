CREATE TABLE "WasteEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "journalEntryId" TEXT,

    CONSTRAINT "WasteEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WasteEventLine" (
    "id" TEXT NOT NULL,
    "wasteEventId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "WasteEventLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WasteEvent_journalEntryId_key" ON "WasteEvent"("journalEntryId");

ALTER TABLE "WasteEvent" ADD CONSTRAINT "WasteEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WasteEvent" ADD CONSTRAINT "WasteEvent_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WasteEvent" ADD CONSTRAINT "WasteEvent_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WasteEventLine" ADD CONSTRAINT "WasteEventLine_wasteEventId_fkey" FOREIGN KEY ("wasteEventId") REFERENCES "WasteEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WasteEventLine" ADD CONSTRAINT "WasteEventLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
