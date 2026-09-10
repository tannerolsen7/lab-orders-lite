/*
  Warnings:

  - Added the required column `createdById` to the `LabTest` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LabTest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "turnaroundHours" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    CONSTRAINT "LabTest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LabTest_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LabTest" ("active", "code", "createdAt", "id", "name", "priceCents", "turnaroundHours", "updatedAt", "updatedById") SELECT "active", "code", "createdAt", "id", "name", "priceCents", "turnaroundHours", "updatedAt", "updatedById" FROM "LabTest";
DROP TABLE "LabTest";
ALTER TABLE "new_LabTest" RENAME TO "LabTest";
CREATE UNIQUE INDEX "LabTest_code_key" ON "LabTest"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
