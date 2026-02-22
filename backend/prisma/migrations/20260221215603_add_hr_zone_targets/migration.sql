-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "weekly_hr_zone1_mins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "weekly_hr_zone2_mins" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "weekly_hr_zone3_mins" INTEGER NOT NULL DEFAULT 90,
ADD COLUMN     "weekly_hr_zone4_mins" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "weekly_hr_zone5_mins" INTEGER NOT NULL DEFAULT 10;
