import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import { DomainError } from '../domain/errors';
import { ConcurrentLicenseService } from '../application/services/ConcurrentLicenseService';
import { AttachmentStorageService } from '../application/services/AttachmentStorageService';
import { getContext } from './AuthContext';

function hasAny(granted: string[], required: string[]): boolean {
    if (granted.includes('ALL') || granted.includes('*.*')) return true;
    for (const key of required) {
        if (granted.includes(key)) return true;
    }
    return false;
}

function ensurePermission(ctx: any, required: string[]) {
    const permissions = Array.isArray(ctx?.permissions) ? ctx.permissions : [];
    const capabilities = Array.isArray(ctx?.capabilities) ? ctx.capabilities : [];
    const granted = [...permissions, ...capabilities];
    if (!hasAny(granted, required)) {
        throw new Error('PERMISSION_DENIED');
    }
}

function normalizeChunk(chunk: any): Buffer | Uint8Array | number[] | ArrayBuffer {
    if (Buffer.isBuffer(chunk)) return chunk;
    if (chunk instanceof Uint8Array) return chunk;
    if (chunk instanceof ArrayBuffer) return chunk;
    if (Array.isArray(chunk)) return chunk;
    if (chunk && typeof chunk === 'object' && Array.isArray(chunk.data)) {
        return chunk.data as number[];
    }
    throw new DomainError('VALIDATION_ERROR', 'Invalid chunk payload');
}

function safeString(value: any, field: string): string {
    const normalized = String(value || '').trim();
    if (!normalized) {
        throw new DomainError('VALIDATION_ERROR', `${field} is required`);
    }
    return normalized;
}

function safeNumber(value: any, field: string): number {
    const normalized = Number(value);
    if (!Number.isFinite(normalized)) {
        throw new DomainError('VALIDATION_ERROR', `${field} must be numeric`);
    }
    return normalized;
}

type RuntimeGovernanceServices = {
    concurrentLicenseService: ConcurrentLicenseService;
    attachmentStorageService: AttachmentStorageService;
};

export function registerRuntimeGovernanceIPC(services: RuntimeGovernanceServices) {
    const { concurrentLicenseService, attachmentStorageService } = services;

    ipcMain.handle('runtimeLicense:getStatus', ipcWrap(async (event, companyId?: string) => {
        const ctx = getContext(event as any);
        ensurePermission(ctx, [
            'license.concurrent_user.monitor',
            'license.concurrent_user.allocate',
            'system.settings',
        ]);
        return concurrentLicenseService.getStatus(String(companyId || ctx.companyId || 'COMP_01'));
    }));

    ipcMain.handle('runtimeLicense:setExtraSeats', ipcWrap(async (event, payload: { companyId?: string; extraSeats: number }) => {
        const ctx = getContext(event as any);
        ensurePermission(ctx, [
            'license.concurrent_user.allocate',
            'system.settings',
        ]);
        const companyId = String(payload?.companyId || ctx.companyId || 'COMP_01');
        const extraSeats = Math.max(0, Math.floor(safeNumber(payload?.extraSeats, 'extraSeats')));
        return concurrentLicenseService.setExtraSeats(companyId, extraSeats, {
            userId: String(ctx.userId),
            branchId: String(ctx.branchId),
        });
    }));

    ipcMain.handle('runtimeLicense:heartbeat', ipcWrap(async (event) => {
        const webContentsId = event?.sender?.id;
        if (webContentsId) {
            concurrentLicenseService.heartbeat(webContentsId);
        }
        return { success: true };
    }));

    ipcMain.handle('attachments:startUpload', ipcWrap(async (event, payload: any) => {
        const ctx = getContext(event as any);
        return attachmentStorageService.startUpload(ctx, {
            moduleKey: safeString(payload?.moduleKey, 'moduleKey'),
            entityName: safeString(payload?.entityName, 'entityName'),
            entityId: safeString(payload?.entityId, 'entityId'),
            fileName: safeString(payload?.fileName, 'fileName'),
            mimeType: String(payload?.mimeType || 'application/octet-stream'),
            totalSize: safeNumber(payload?.totalSize, 'totalSize'),
            chunkSize: payload?.chunkSize !== undefined ? safeNumber(payload?.chunkSize, 'chunkSize') : undefined,
            checksumSha256: payload?.checksumSha256 ? String(payload.checksumSha256) : undefined,
        });
    }));

    ipcMain.handle('attachments:uploadChunk', ipcWrap(async (event, payload: any) => {
        const ctx = getContext(event as any);
        const chunkIndex = Math.max(0, Math.floor(safeNumber(payload?.chunkIndex, 'chunkIndex')));
        return attachmentStorageService.uploadChunk(ctx, {
            sessionId: safeString(payload?.sessionId, 'sessionId'),
            chunkIndex,
            chunk: normalizeChunk(payload?.chunk),
            checksumSha256: payload?.checksumSha256 ? String(payload.checksumSha256) : undefined,
        });
    }));

    ipcMain.handle('attachments:completeUpload', ipcWrap(async (event, payload: { sessionId: string }) => {
        const ctx = getContext(event as any);
        return attachmentStorageService.completeUpload(ctx, {
            sessionId: safeString(payload?.sessionId, 'sessionId'),
        });
    }));

    ipcMain.handle('attachments:abortUpload', ipcWrap(async (event, payload: { sessionId: string }) => {
        const ctx = getContext(event as any);
        return attachmentStorageService.abortUpload(ctx, {
            sessionId: safeString(payload?.sessionId, 'sessionId'),
        });
    }));

    ipcMain.handle('attachments:getQuota', ipcWrap(async (event) => {
        const ctx = getContext(event as any);
        return attachmentStorageService.getQuota(ctx);
    }));

    ipcMain.handle('attachments:updateTier', ipcWrap(async (event, tier: 'BASE_5GB' | 'EXT_10GB') => {
        const ctx = getContext(event as any);
        if (tier !== 'BASE_5GB' && tier !== 'EXT_10GB') {
            throw new DomainError('VALIDATION_ERROR', 'Invalid quota tier');
        }
        return attachmentStorageService.updateTier(ctx, tier);
    }));

    ipcMain.handle('attachments:addAddon', ipcWrap(async (event, addonGb: 10 | 15 | 25) => {
        const ctx = getContext(event as any);
        if (![10, 15, 25].includes(Number(addonGb))) {
            throw new DomainError('VALIDATION_ERROR', 'Unsupported attachment add-on size');
        }
        return attachmentStorageService.addAddon(ctx, Number(addonGb) as 10 | 15 | 25);
    }));

    ipcMain.handle('attachments:listFiles', ipcWrap(async (event, payload: { entityName: string; entityId: string }) => {
        const ctx = getContext(event as any);
        return attachmentStorageService.listFiles(
            ctx,
            safeString(payload?.entityName, 'entityName'),
            safeString(payload?.entityId, 'entityId')
        );
    }));

    ipcMain.handle('attachments:deleteFile', ipcWrap(async (event, fileId: string) => {
        const ctx = getContext(event as any);
        return attachmentStorageService.deleteFile(ctx, safeString(fileId, 'fileId'));
    }));
}
