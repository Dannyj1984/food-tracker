-- CreateEnum
CREATE TYPE "exercise_type" AS ENUM ('football', 'running', 'walking', 'netball', 'gym', 'swimming', 'other');

-- CreateTable
CREATE TABLE "exercise_log" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "exercise_type" "exercise_type" NOT NULL,
    "calories_burnt" INTEGER NOT NULL,
    "hr_zone1_seconds" INTEGER,
    "hr_zone2_seconds" INTEGER,
    "hr_zone3_seconds" INTEGER,
    "hr_zone4_seconds" INTEGER,
    "hr_zone5_seconds" INTEGER,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercise_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exercise_log_user_id_date_idx" ON "exercise_log"("user_id", "date");

-- AddForeignKey
ALTER TABLE "exercise_log" ADD CONSTRAINT "exercise_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
