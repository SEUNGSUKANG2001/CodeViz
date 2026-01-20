-- AlterTable
ALTER TABLE "user_identities" ADD COLUMN     "access_token" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "default_planet_id" UUID;

-- CreateTable
CREATE TABLE "planets" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "project_id" UUID,
    "seed" INTEGER NOT NULL,
    "params" JSONB NOT NULL DEFAULT '{}',
    "palette" JSONB NOT NULL DEFAULT '{}',
    "cloud_color" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" UUID NOT NULL,
    "planet_id" UUID NOT NULL,
    "project_id" UUID,
    "city_json_key" TEXT NOT NULL,
    "stats_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "planets_project_id_key" ON "planets"("project_id");

-- CreateIndex
CREATE INDEX "planets_owner_id_created_at_idx" ON "planets"("owner_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "cities_planet_id_key" ON "cities"("planet_id");

-- CreateIndex
CREATE UNIQUE INDEX "cities_project_id_key" ON "cities"("project_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_default_planet_id_fkey" FOREIGN KEY ("default_planet_id") REFERENCES "planets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planets" ADD CONSTRAINT "planets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planets" ADD CONSTRAINT "planets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_planet_id_fkey" FOREIGN KEY ("planet_id") REFERENCES "planets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
