-- Separate new Softcopy creation requests from revision requests.
ALTER TYPE "DocumentActionRequested" ADD VALUE IF NOT EXISTS 'CREATE';
ALTER TYPE "DocumentActionRequested" ADD VALUE IF NOT EXISTS 'REVISE';
