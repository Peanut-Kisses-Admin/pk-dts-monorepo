CREATE TABLE "notification_reads" (
  "notification_read_id" BIGSERIAL NOT NULL,
  "user_id" BIGINT NOT NULL,
  "event_key" VARCHAR(180) NOT NULL,
  "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_reads_pkey" PRIMARY KEY ("notification_read_id")
);
CREATE UNIQUE INDEX "notification_reads_user_id_event_key_key" ON "notification_reads"("user_id", "event_key");
CREATE INDEX "notification_reads_user_id_read_at_idx" ON "notification_reads"("user_id", "read_at");
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
