CREATE TYPE "SoftcopyArtifactType" AS ENUM ('CONTROLLED', 'UNCONTROLLED');

CREATE TABLE "softcopy_revision_artifacts" (
    "artifact_id" BIGSERIAL NOT NULL,
    "revision_id" BIGINT NOT NULL,
    "artifact_type" "SoftcopyArtifactType" NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "file_size" BIGINT NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "source_fingerprint" VARCHAR(128) NOT NULL,
    "generator_version" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "softcopy_revision_artifacts_pkey" PRIMARY KEY ("artifact_id")
);

CREATE UNIQUE INDEX "softcopy_revision_artifacts_revision_id_artifact_type_key"
    ON "softcopy_revision_artifacts"("revision_id", "artifact_type");

CREATE INDEX "softcopy_revision_artifacts_source_fingerprint_idx"
    ON "softcopy_revision_artifacts"("source_fingerprint");

ALTER TABLE "softcopy_revision_artifacts"
    ADD CONSTRAINT "softcopy_revision_artifacts_revision_id_fkey"
    FOREIGN KEY ("revision_id") REFERENCES "document_revisions"("revision_id")
    ON DELETE CASCADE ON UPDATE CASCADE;
