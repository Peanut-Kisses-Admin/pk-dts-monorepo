ALTER TABLE "hardcopy_transfer_requests"
  ALTER COLUMN "document_copy_number" DROP NOT NULL,
  ALTER COLUMN "transfer_to" DROP NOT NULL;
