/*
  Warnings:

  - You are about to drop the column `aiModel` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "aiModel",
ADD COLUMN     "aiModelName" TEXT,
ALTER COLUMN "aiProvider" DROP DEFAULT;
