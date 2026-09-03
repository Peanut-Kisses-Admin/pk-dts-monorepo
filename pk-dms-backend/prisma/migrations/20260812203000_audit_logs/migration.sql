CREATE TABLE "audit_logs" ("audit_log_id" BIGSERIAL NOT NULL,"user_id" BIGINT,"user_name" VARCHAR(220) NOT NULL,"user_email" VARCHAR(150) NOT NULL,"role_name" VARCHAR(100) NOT NULL,"action" VARCHAR(30) NOT NULL,"module" VARCHAR(100) NOT NULL,"description" VARCHAR(500) NOT NULL,"method" VARCHAR(10) NOT NULL,"path" VARCHAR(500) NOT NULL,"entity_id" VARCHAR(100),"metadata" JSONB,"ip_address" VARCHAR(100),"user_agent" VARCHAR(500),"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("audit_log_id"));
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id","created_at");
CREATE INDEX "audit_logs_module_created_at_idx" ON "audit_logs"("module","created_at");
CREATE INDEX "audit_logs_entity_id_created_at_idx" ON "audit_logs"("entity_id","created_at");
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
