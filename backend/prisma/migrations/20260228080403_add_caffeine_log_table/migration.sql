-- CreateTable
CREATE TABLE "caffeine_log" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "time" TIME NOT NULL,
    "amount_mg" INTEGER NOT NULL,

    CONSTRAINT "caffeine_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "caffeine_log_user_id_date_idx" ON "caffeine_log"("user_id", "date");

-- AddForeignKey
ALTER TABLE "caffeine_log" ADD CONSTRAINT "caffeine_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
