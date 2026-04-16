"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttachmentStorageService = void 0;
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const uuid_1 = require("uuid");
const errors_1 = require("../../domain/errors");
const DEFAULT_CHUNK_SIZE = 8 * 1024 * 1024;
const MAX_5GB = 5 * 1024 * 1024 * 1024;
const MAX_10GB = 10 * 1024 * 1024 * 1024;
class AttachmentStorageService {
    constructor(repo) {
        this.repo = repo;
        this.rootDir = path_1.default.join(electron_1.app.getPath('userData'), 'uploads', 'attachments');
        if (!fs_1.default.existsSync(this.rootDir)) {
            fs_1.default.mkdirSync(this.rootDir, { recursive: true });
        }
    }
    ensureAuthorized(ctx, capabilityKey, legacy = []) {
        const perms = Array.isArray(ctx.permissions) ? ctx.permissions : [];
        const caps = Array.isArray(ctx.capabilities) ? ctx.capabilities : [];
        const allowed = caps.includes(capabilityKey) ||
            perms.includes(capabilityKey) ||
            perms.includes('ALL') ||
            perms.includes('*.*') ||
            perms.includes('core.attachments.manage') ||
            legacy.some((p) => perms.includes(p));
        if (!allowed)
            throw new errors_1.DomainError('PERMISSION_DENIED', `Missing permission for ${capabilityKey}`);
    }
    getChunkDir(sessionId) {
        return path_1.default.join(this.rootDir, 'chunks', sessionId);
    }
    ensureDir(dir) {
        if (!fs_1.default.existsSync(dir))
            fs_1.default.mkdirSync(dir, { recursive: true });
    }
    sanitizeFileName(fileName) {
        const normalized = String(fileName || 'file.bin').trim();
        return normalized.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').slice(0, 180);
    }
    toBuffer(data) {
        if (Buffer.isBuffer(data))
            return data;
        if (data instanceof Uint8Array)
            return Buffer.from(data);
        return Buffer.from(data);
    }
    getMaxFileSizeByTier(quotaTier) {
        return quotaTier === 'EXT_10GB' ? MAX_10GB : MAX_5GB;
    }
    startUpload(ctx, data) {
        this.ensureAuthorized(ctx, 'attachments.file.upload', ['attachments.manage']);
        const quota = this.repo.getAttachmentQuota(ctx.companyId);
        const chunkSize = Math.max(1, Number(data.chunkSize || DEFAULT_CHUNK_SIZE));
        const totalSize = Math.max(0, Number(data.totalSize || 0));
        const maxFileSize = this.getMaxFileSizeByTier(String(quota?.quota_tier || 'BASE_5GB'));
        if (totalSize <= 0) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'File size must be greater than zero');
        }
        if (totalSize > maxFileSize) {
            throw new errors_1.DomainError('VALIDATION_ERROR', `File exceeds allowed limit for tier (${maxFileSize} bytes)`);
        }
        const totalQuota = Number(quota?.total_quota_bytes || 0);
        const usedQuota = Number(quota?.used_quota_bytes || 0);
        if ((usedQuota + totalSize) > totalQuota) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Attachment quota exceeded');
        }
        const id = (0, uuid_1.v4)();
        const expectedChunks = Math.ceil(totalSize / chunkSize);
        const session = this.repo.createUploadSession({
            id,
            companyId: ctx.companyId,
            branchId: ctx.branchId,
            moduleKey: data.moduleKey,
            entityName: data.entityName,
            entityId: data.entityId,
            fileName: this.sanitizeFileName(data.fileName),
            mimeType: String(data.mimeType || 'application/octet-stream'),
            totalSize,
            chunkSize,
            expectedChunks,
            checksumSha256: data.checksumSha256,
            createdBy: ctx.userId,
        });
        this.ensureDir(this.getChunkDir(id));
        this.repo.appendAuditEvent({
            id: (0, uuid_1.v4)(),
            companyId: ctx.companyId,
            branchId: ctx.branchId,
            actorUserId: ctx.userId,
            actionKey: 'attachments.file.upload.start',
            entityName: 'sys_attachment_upload_sessions',
            entityId: id,
            payloadJson: JSON.stringify({ totalSize, expectedChunks, moduleKey: data.moduleKey }),
        });
        return {
            sessionId: id,
            chunkSize,
            expectedChunks,
            quota: {
                usedBytes: usedQuota,
                totalBytes: totalQuota,
                availableBytes: Math.max(0, totalQuota - usedQuota),
                tier: quota?.quota_tier || 'BASE_5GB',
            },
            session,
        };
    }
    uploadChunk(ctx, data) {
        this.ensureAuthorized(ctx, 'attachments.file.upload', ['attachments.manage']);
        const session = this.repo.getUploadSession(data.sessionId);
        if (!session || session.status !== 'UPLOADING') {
            throw new errors_1.DomainError('NOT_FOUND', 'Upload session is not active');
        }
        if (session.company_id !== ctx.companyId) {
            throw new errors_1.DomainError('PERMISSION_DENIED', 'Cross-company upload is not allowed');
        }
        const buffer = this.toBuffer(data.chunk);
        if (buffer.length > Number(session.chunk_size)) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Chunk exceeds allowed chunk size');
        }
        const chunkDir = this.getChunkDir(data.sessionId);
        this.ensureDir(chunkDir);
        const chunkPath = path_1.default.join(chunkDir, `${data.chunkIndex}.part`);
        fs_1.default.writeFileSync(chunkPath, buffer);
        const hash = crypto_1.default.createHash('sha256').update(buffer).digest('hex');
        if (data.checksumSha256 && data.checksumSha256 !== hash) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Chunk checksum mismatch');
        }
        this.repo.addUploadChunk({
            id: (0, uuid_1.v4)(),
            sessionId: data.sessionId,
            chunkIndex: Number(data.chunkIndex),
            chunkSize: buffer.length,
            checksumSha256: hash,
            chunkPath,
        });
        return {
            sessionId: data.sessionId,
            chunkIndex: Number(data.chunkIndex),
            chunkSize: buffer.length,
            checksumSha256: hash,
        };
    }
    completeUpload(ctx, data) {
        this.ensureAuthorized(ctx, 'attachments.file.upload', ['attachments.manage']);
        const session = this.repo.getUploadSession(data.sessionId);
        if (!session || session.status !== 'UPLOADING') {
            throw new errors_1.DomainError('NOT_FOUND', 'Upload session is not active');
        }
        if (session.company_id !== ctx.companyId) {
            throw new errors_1.DomainError('PERMISSION_DENIED', 'Cross-company upload is not allowed');
        }
        const chunks = this.repo.listUploadChunks(data.sessionId);
        if (chunks.length !== Number(session.expected_chunks)) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Upload session has missing chunks');
        }
        const year = new Date().getFullYear();
        const finalDir = path_1.default.join(this.rootDir, 'files', ctx.companyId, String(year));
        this.ensureDir(finalDir);
        const safeFileName = this.sanitizeFileName(String(session.file_name));
        const fileId = (0, uuid_1.v4)();
        const finalPath = path_1.default.join(finalDir, `${fileId}-${safeFileName}`);
        let totalWritten = 0;
        let finalChecksum = '';
        try {
            const finalHasher = crypto_1.default.createHash('sha256');
            for (const chunk of chunks) {
                const content = fs_1.default.readFileSync(chunk.chunk_path);
                fs_1.default.appendFileSync(finalPath, content);
                totalWritten += content.length;
                finalHasher.update(content);
            }
            if (totalWritten !== Number(session.total_size)) {
                throw new errors_1.DomainError('VALIDATION_ERROR', 'Final file size mismatch');
            }
            finalChecksum = finalHasher.digest('hex');
        }
        catch (error) {
            if (fs_1.default.existsSync(finalPath)) {
                try {
                    fs_1.default.unlinkSync(finalPath);
                }
                catch {
                    // Best effort cleanup.
                }
            }
            throw error;
        }
        if (session.checksum_sha256 && String(session.checksum_sha256) !== finalChecksum) {
            if (fs_1.default.existsSync(finalPath)) {
                try {
                    fs_1.default.unlinkSync(finalPath);
                }
                catch {
                    // Best effort cleanup.
                }
            }
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Final file checksum mismatch');
        }
        const file = this.repo.createAttachmentFile({
            id: fileId,
            companyId: ctx.companyId,
            branchId: session.branch_id,
            moduleKey: session.module_key,
            entityName: session.entity_name,
            entityId: session.entity_id,
            fileName: safeFileName,
            mimeType: session.mime_type,
            sizeBytes: totalWritten,
            storagePath: finalPath,
            checksumSha256: finalChecksum,
            createdBy: ctx.userId,
        });
        this.repo.completeUploadSession(data.sessionId);
        this.repo.increaseUsedQuota(ctx.companyId, totalWritten);
        fs_1.default.rmSync(this.getChunkDir(data.sessionId), { recursive: true, force: true });
        this.repo.appendAuditEvent({
            id: (0, uuid_1.v4)(),
            companyId: ctx.companyId,
            branchId: ctx.branchId,
            actorUserId: ctx.userId,
            actionKey: 'attachments.file.upload.complete',
            entityName: 'sys_attachment_files',
            entityId: fileId,
            payloadJson: JSON.stringify({
                sessionId: data.sessionId,
                sizeBytes: totalWritten,
                checksumSha256: finalChecksum,
            }),
        });
        return file;
    }
    abortUpload(ctx, data) {
        this.ensureAuthorized(ctx, 'attachments.file.upload', ['attachments.manage']);
        const session = this.repo.getUploadSession(data.sessionId);
        if (!session)
            return { success: true };
        if (session.company_id !== ctx.companyId) {
            throw new errors_1.DomainError('PERMISSION_DENIED', 'Cross-company upload is not allowed');
        }
        this.repo.abortUploadSession(data.sessionId);
        fs_1.default.rmSync(this.getChunkDir(data.sessionId), { recursive: true, force: true });
        this.repo.appendAuditEvent({
            id: (0, uuid_1.v4)(),
            companyId: ctx.companyId,
            branchId: ctx.branchId,
            actorUserId: ctx.userId,
            actionKey: 'attachments.file.upload.abort',
            entityName: 'sys_attachment_upload_sessions',
            entityId: data.sessionId,
        });
        return { success: true };
    }
    getQuota(ctx) {
        this.ensureAuthorized(ctx, 'attachments.quota.manage', ['attachments.manage', 'system.settings']);
        const quota = this.repo.getAttachmentQuota(ctx.companyId);
        return {
            companyId: ctx.companyId,
            tier: quota.quota_tier,
            baseQuotaBytes: Number(quota.base_quota_bytes),
            addonQuotaBytes: Number(quota.addon_quota_bytes),
            usedQuotaBytes: Number(quota.used_quota_bytes),
            totalQuotaBytes: Number(quota.total_quota_bytes),
            availableBytes: Math.max(0, Number(quota.total_quota_bytes) - Number(quota.used_quota_bytes)),
        };
    }
    updateTier(ctx, tier) {
        this.ensureAuthorized(ctx, 'attachments.quota.manage', ['system.settings']);
        const quota = this.repo.updateAttachmentTier(ctx.companyId, tier);
        this.repo.appendAuditEvent({
            id: (0, uuid_1.v4)(),
            companyId: ctx.companyId,
            branchId: ctx.branchId,
            actorUserId: ctx.userId,
            actionKey: 'attachments.quota.tier.update',
            entityName: 'sys_attachment_quota',
            entityId: ctx.companyId,
            payloadJson: JSON.stringify({ tier }),
        });
        return quota;
    }
    addAddon(ctx, addonGb) {
        this.ensureAuthorized(ctx, 'attachments.storage.addon.assign', ['system.settings']);
        const quota = this.repo.addAttachmentAddon(ctx.companyId, addonGb);
        this.repo.appendAuditEvent({
            id: (0, uuid_1.v4)(),
            companyId: ctx.companyId,
            branchId: ctx.branchId,
            actorUserId: ctx.userId,
            actionKey: 'attachments.storage.addon.assign',
            entityName: 'sys_attachment_quota',
            entityId: ctx.companyId,
            payloadJson: JSON.stringify({ addonGb }),
        });
        return quota;
    }
    listFiles(ctx, entityName, entityId) {
        this.ensureAuthorized(ctx, 'attachments.file.download', ['attachments.manage']);
        return this.repo.listAttachmentFiles(ctx.companyId, entityName, entityId);
    }
    deleteFile(ctx, fileId) {
        this.ensureAuthorized(ctx, 'attachments.file.delete', ['attachments.manage']);
        const file = this.repo.getAttachmentFile(fileId);
        if (!file)
            throw new errors_1.DomainError('NOT_FOUND', 'Attachment not found');
        if (file.company_id !== ctx.companyId) {
            throw new errors_1.DomainError('PERMISSION_DENIED', 'Cross-company delete is not allowed');
        }
        this.repo.markAttachmentDeleted(fileId);
        this.repo.decreaseUsedQuota(ctx.companyId, Number(file.size_bytes || 0));
        try {
            if (fs_1.default.existsSync(file.storage_path))
                fs_1.default.unlinkSync(file.storage_path);
        }
        catch (error) {
            console.warn('[AttachmentStorage] Could not delete file from disk:', error);
        }
        this.repo.appendAuditEvent({
            id: (0, uuid_1.v4)(),
            companyId: ctx.companyId,
            branchId: ctx.branchId,
            actorUserId: ctx.userId,
            actionKey: 'attachments.file.delete',
            entityName: 'sys_attachment_files',
            entityId: fileId,
            payloadJson: JSON.stringify({ sizeBytes: file.size_bytes }),
        });
        return { success: true };
    }
}
exports.AttachmentStorageService = AttachmentStorageService;
