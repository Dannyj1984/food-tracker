/*
  Warnings:

  - You are about to drop the column `weekly_hr_zone1_mins` on the `settings` table. All the data in the column will be lost.
  - You are about to drop the column `weekly_hr_zone2_mins` on the `settings` table. All the data in the column will be lost.
  - You are about to drop the column `weekly_hr_zone3_mins` on the `settings` table. All the data in the column will be lost.
  - You are about to drop the column `weekly_hr_zone4_mins` on the `settings` table. All the data in the column will be lost.
  - You are about to drop the column `weekly_hr_zone5_mins` on the `settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "settings" DROP COLUMN "weekly_hr_zone1_mins",
DROP COLUMN "weekly_hr_zone2_mins",
DROP COLUMN "weekly_hr_zone3_mins",
DROP COLUMN "weekly_hr_zone4_mins",
DROP COLUMN "weekly_hr_zone5_mins",
ADD COLUMN     "weekly_hr_zone13_mins" INTEGER NOT NULL DEFAULT 150,
ADD COLUMN     "weekly_hr_zone45_mins" INTEGER NOT NULL DEFAULT 40;
