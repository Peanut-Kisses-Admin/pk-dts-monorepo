import { randomUUID } from "crypto";
import { existsSync, mkdirSync } from "fs";
import { extname, join } from "path";

export const uploadsRoot = join(process.cwd(), "uploads");
export const revisionUploadsRoot = join(uploadsRoot, "revisions");
export const artifactUploadsRoot = join(uploadsRoot, "artifacts");
export const attachmentUploadsRoot = join(uploadsRoot, "attachments");
export const batchImportUploadsRoot = join(uploadsRoot, "batch-imports");
export const backupRestoreUploadsRoot = join(uploadsRoot, "backup-restores");

export function ensureRevisionUploadsRoot() {
  if (!existsSync(revisionUploadsRoot)) {
    mkdirSync(revisionUploadsRoot, { recursive: true });
  }
}

export function ensureArtifactUploadsRoot() {
  if (!existsSync(artifactUploadsRoot)) {
    mkdirSync(artifactUploadsRoot, { recursive: true });
  }
}

export function ensureAttachmentUploadsRoot() {
  if (!existsSync(attachmentUploadsRoot)) {
    mkdirSync(attachmentUploadsRoot, { recursive: true });
  }
}

export function ensureRevisionCategoryUploadsRoot(folderName: string) {
  const categoryRoot = join(revisionUploadsRoot, folderName);
  if (!existsSync(categoryRoot)) {
    mkdirSync(categoryRoot, { recursive: true });
  }
  return categoryRoot;
}

export function ensureAttachmentCategoryUploadsRoot(folderName: string) {
  const categoryRoot = join(attachmentUploadsRoot, folderName);
  if (!existsSync(categoryRoot)) {
    mkdirSync(categoryRoot, { recursive: true });
  }
  return categoryRoot;
}

export function ensureBatchImportUploadsRoot() {
  if (!existsSync(batchImportUploadsRoot)) {
    mkdirSync(batchImportUploadsRoot, { recursive: true });
  }
}

export function ensureBackupRestoreUploadsRoot() {
  if (!existsSync(backupRestoreUploadsRoot)) {
    mkdirSync(backupRestoreUploadsRoot, { recursive: true });
  }
}

export function createRevisionFilename(originalName: string) {
  return createUploadFilename(originalName, "revision");
}

export function createAttachmentFilename(originalName: string) {
  return createUploadFilename(originalName, "attachment");
}

export function createBatchImportFilename(originalName: string) {
  return createUploadFilename(originalName, "batch-import");
}

export function createBackupImportFilename(originalName: string) {
  return createUploadFilename(originalName, "backup-restore");
}

function createUploadFilename(originalName: string, fallbackBaseName: string) {
  const extension = extname(originalName);
  const baseName = originalName
    .slice(0, originalName.length - extension.length)
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return `${Date.now()}-${randomUUID()}-${baseName || fallbackBaseName}${extension}`;
}

export function buildRevisionPublicUrl(storagePath: string) {
  const baseUrl = process.env.UPLOAD_BASE_URL || process.env.APP_BASE_URL || "";

  const encodedPath = storagePath
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");

  return `${baseUrl.replace(/\/$/, "")}/uploads/revisions/${encodedPath}`;
}

export function buildAttachmentPublicUrl(storagePath: string) {
  const baseUrl = process.env.UPLOAD_BASE_URL || process.env.APP_BASE_URL || "";

  const encodedPath = storagePath
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");

  return `${baseUrl.replace(/\/$/, "")}/uploads/attachments/${encodedPath}`;
}
