-- CreateTable
CREATE TABLE "shared_meal_calendar" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "custom_meal_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shared_meal_calendar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shared_meal_calendar_date_key" ON "shared_meal_calendar"("date");

-- AddForeignKey
ALTER TABLE "shared_meal_calendar" ADD CONSTRAINT "shared_meal_calendar_custom_meal_id_fkey" FOREIGN KEY ("custom_meal_id") REFERENCES "custom_meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_meal_calendar" ADD CONSTRAINT "shared_meal_calendar_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
