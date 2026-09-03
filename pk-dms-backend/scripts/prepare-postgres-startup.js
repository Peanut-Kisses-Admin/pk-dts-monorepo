const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const { loadEnv } = require('./env-runtime');

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  loadEnv(rootDir, process.env.APP_ENV || process.env.NODE_ENV || 'production');

  const databaseUrl = process.env.DATABASE_URL || '';
  if (!databaseUrl.startsWith('postgres')) {
    console.log('Startup prepare skipped: DATABASE_URL is not PostgreSQL.');
    return;
  }

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentStatus') THEN
          ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'Draft';
          ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'PendingApproval';
          ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'Approved';
          ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'Rejected';
          ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'ForRevision';
          ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'Disposed';
        END IF;
      END
      $$;
    `);

    const [documentsTable] = await prisma.$queryRawUnsafe(`
      SELECT to_regclass('public.documents') IS NOT NULL AS "exists";
    `);

    if (!documentsTable?.exists) {
      console.log(
        'PostgreSQL startup prepare skipped: documents table does not exist yet.',
      );
      return;
    }

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "documents"
      ADD COLUMN IF NOT EXISTS "status_before_disposal" "DocumentStatus",
      ADD COLUMN IF NOT EXISTS "requester_type" VARCHAR(30),
      ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "review_remarks" TEXT,
      ADD COLUMN IF NOT EXISTS "reviewed_by_name" VARCHAR(150),
      ADD COLUMN IF NOT EXISTS "reviewed_by_user_id" BIGINT,
      ADD COLUMN IF NOT EXISTS "requested_by_name" VARCHAR(150),
      ADD COLUMN IF NOT EXISTS "requested_by_user_id" BIGINT;
    `);

    await prisma.$executeRawUnsafe(`
      UPDATE "documents"
      SET
        "status" = 'Approved',
        "requested_by_user_id" = COALESCE("requested_by_user_id", "created_by")
      WHERE "status"::text = 'Active';
    `);

    await prisma.$executeRawUnsafe(`
      UPDATE "documents"
      SET "requested_by_user_id" = "created_by"
      WHERE "requested_by_user_id" IS NULL;
    `);

    console.log('PostgreSQL startup prepare completed.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('PostgreSQL startup prepare failed:', error);
  process.exit(1);
});
