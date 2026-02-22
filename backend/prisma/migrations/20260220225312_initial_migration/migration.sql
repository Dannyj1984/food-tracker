-- CreateEnum
CREATE TYPE "meal_type" AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');

-- CreateEnum
CREATE TYPE "food_source" AS ENUM ('openfoodfacts', 'custom_food', 'custom_meal');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "daily_calorie_target" INTEGER NOT NULL DEFAULT 2000,
    "daily_water_target_ml" INTEGER NOT NULL DEFAULT 2500,
    "daily_caffeine_target_mg" INTEGER NOT NULL DEFAULT 400,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_foods" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "barcode" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "brand" VARCHAR(255),
    "serving_size_g" DECIMAL(10,2) NOT NULL,
    "calories_per_100g" DECIMAL(10,2) NOT NULL,
    "fat_per_100g" DECIMAL(10,2) NOT NULL,
    "saturated_fat_per_100g" DECIMAL(10,2) NOT NULL,
    "carbs_per_100g" DECIMAL(10,2) NOT NULL,
    "sugars_per_100g" DECIMAL(10,2) NOT NULL,
    "fiber_per_100g" DECIMAL(10,2) NOT NULL,
    "protein_per_100g" DECIMAL(10,2) NOT NULL,
    "salt_per_100g" DECIMAL(10,2) NOT NULL,
    "caffeine_per_100g" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_foods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_meals" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "serving_size_g" DECIMAL(10,2) NOT NULL,
    "calories" DECIMAL(10,2) NOT NULL,
    "fat" DECIMAL(10,2) NOT NULL,
    "saturated_fat" DECIMAL(10,2) NOT NULL,
    "carbs" DECIMAL(10,2) NOT NULL,
    "sugars" DECIMAL(10,2) NOT NULL,
    "fiber" DECIMAL(10,2) NOT NULL,
    "protein" DECIMAL(10,2) NOT NULL,
    "salt" DECIMAL(10,2) NOT NULL,
    "caffeine" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_log" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "time" TIME NOT NULL,
    "meal_type" "meal_type" NOT NULL,
    "source" "food_source" NOT NULL,
    "source_id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "quantity_g" DECIMAL(10,2) NOT NULL,
    "calories" DECIMAL(10,2) NOT NULL,
    "fat" DECIMAL(10,2) NOT NULL,
    "saturated_fat" DECIMAL(10,2) NOT NULL,
    "carbs" DECIMAL(10,2) NOT NULL,
    "sugars" DECIMAL(10,2) NOT NULL,
    "fiber" DECIMAL(10,2) NOT NULL,
    "protein" DECIMAL(10,2) NOT NULL,
    "salt" DECIMAL(10,2) NOT NULL,
    "caffeine" DECIMAL(10,2),

    CONSTRAINT "food_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_log" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "time" TIME NOT NULL,
    "amount_ml" INTEGER NOT NULL,

    CONSTRAINT "water_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "settings_user_id_key" ON "settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_foods_user_id_barcode_key" ON "custom_foods"("user_id", "barcode");

-- CreateIndex
CREATE INDEX "food_log_user_id_date_idx" ON "food_log"("user_id", "date");

-- CreateIndex
CREATE INDEX "water_log_user_id_date_idx" ON "water_log"("user_id", "date");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_foods" ADD CONSTRAINT "custom_foods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_meals" ADD CONSTRAINT "custom_meals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_log" ADD CONSTRAINT "food_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_log" ADD CONSTRAINT "water_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
