/*
  Warnings:

  - You are about to drop the `Activity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `companyName` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `contactName` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `websiteUrl` on the `Lead` table. All the data in the column will be lost.
  - Added the required column `business` to the `Lead` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Activity_occurredAt_idx";

-- DropIndex
DROP INDEX "Activity_leadId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Activity";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "business" TEXT NOT NULL,
    "niche" TEXT,
    "city" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phoneNumber" TEXT,
    "issueFound" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "contacted" BOOLEAN NOT NULL DEFAULT false,
    "followUpDate" DATETIME,
    "googleMaps" TEXT,
    "sourceLinks" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Lead" ("createdAt", "email", "id", "notes", "status", "updatedAt") SELECT "createdAt", "email", "id", "notes", "status", "updatedAt" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE INDEX "Lead_business_idx" ON "Lead"("business");
CREATE INDEX "Lead_niche_idx" ON "Lead"("niche");
CREATE INDEX "Lead_city_idx" ON "Lead"("city");
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
CREATE INDEX "Lead_priority_idx" ON "Lead"("priority");
CREATE INDEX "Lead_contacted_idx" ON "Lead"("contacted");
CREATE INDEX "Lead_followUpDate_idx" ON "Lead"("followUpDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
