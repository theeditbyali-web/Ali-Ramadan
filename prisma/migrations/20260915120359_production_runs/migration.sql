CREATE TABLE "ProductionRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductionRunLine" (
    "id" TEXT NOT NULL,
    "productionRunId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ProductionRunLine_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProductionRun" ADD CONSTRAINT "ProductionRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductionRun" ADD CONSTRAINT "ProductionRun_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductionRunLine" ADD CONSTRAINT "ProductionRunLine_productionRunId_fkey" FOREIGN KEY ("productionRunId") REFERENCES "ProductionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductionRunLine" ADD CONSTRAINT "ProductionRunLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
