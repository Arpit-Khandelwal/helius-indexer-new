/*
  Warnings:

  - You are about to drop the column `indexerId` on the `User` table. All the data in the column will be lost.
  - Added the required column `userId` to the `Indexer` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_indexerId_fkey";

-- AlterTable
ALTER TABLE "Indexer" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "indexerId";

-- AddForeignKey
ALTER TABLE "Indexer" ADD CONSTRAINT "Indexer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
