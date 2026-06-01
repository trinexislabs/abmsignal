-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Playbook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "productName" TEXT NOT NULL,
    "productUrl" TEXT,
    "productBrief" TEXT NOT NULL,
    "targetCompany" TEXT NOT NULL,
    "targetUrl" TEXT,
    "industry" TEXT NOT NULL,
    "geography" TEXT NOT NULL,
    "priorityTier" TEXT NOT NULL DEFAULT 'tier1',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "agentStatus" TEXT NOT NULL DEFAULT '[]',
    "failedReason" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "paidAt" DATETIME,
    "paymentReference" TEXT,
    "completedAt" DATETIME,
    "openclawSessionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Playbook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Playbook" ("agentStatus", "completedAt", "createdAt", "failedReason", "geography", "id", "industry", "openclawSessionId", "priorityTier", "productBrief", "productName", "productUrl", "progressPct", "status", "targetCompany", "targetUrl", "updatedAt", "userId") SELECT "agentStatus", "completedAt", "createdAt", "failedReason", "geography", "id", "industry", "openclawSessionId", "priorityTier", "productBrief", "productName", "productUrl", "progressPct", "status", "targetCompany", "targetUrl", "updatedAt", "userId" FROM "Playbook";
DROP TABLE "Playbook";
ALTER TABLE "new_Playbook" RENAME TO "Playbook";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Backfill: every playbook that existed before the post-generation paywall was
-- paid for upfront under the old credit model, so it must stay accessible.
UPDATE "Playbook" SET "paymentStatus" = 'paid';
