"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRuntimeGovernanceIPC = registerRuntimeGovernanceIPC;
const electron_1 = require("electron");
const ipcWrap_1 = require("../core/ipcWrap");
const errors_1 = require("../domain/errors");
const AuthContext_1 = require("./AuthContext");
function hasAny(granted, required) {
    if (granted.includes('ALL') || granted.includes('*.*'))
        return true;
    for (const key of required) {
        if (granted.includes(key))
            return true;
    }
    return false;
}
function ensurePermission(ctx, required) {
    const permissions = Array.isArray(ctx?.permissions) ? ctx.permissions : [];
    const capabilities = Array.isArray(ctx?.capabilities) ? ctx.capabilities : [];
    const granted = [...permissions, ...capabilities];
    if (!hasAny(granted, required)) {
        throw new Error('PERMISSION_DENIED');
    }
}
function normalizeChunk(chunk) {
    if (Buffer.isBuffer(chunk))
        return chunk;
    if (chunk instanceof Uint8Array)
        return chunk;
    if (chunk instanceof ArrayBuffer)
        return chunk;
    if (Array.isArray(chunk))
        return chunk;
    if (chunk && typeof chunk === 'object' && Array.isArray(chunk.data)) {
        return chunk.data;
    }
    throw new errors_1.DomainError('VALIDATION_ERROR', 'Invalid chunk payload');
}
function safeString(value, field) {
    const normalized = String(value || '').trim();
    if (!normalized) {
        throw new errors_1.DomainError('VALIDATION_ERROR', `${field} is required`);
    }
    return normalized;
}
function safeNumber(value, field) {
    const normalized = Number(value);
    if (!Number.isFinite(normalized)) {
        throw new errors_1.DomainError('VALIDATION_ERROR', `${field} must be numeric`);
    }
    return normalized;
}
function registerRuntimeGovernanceIPC(services) {
    const { concurrentLicenseService, attachmentStorageService } = services;
    electron_1.ipcMain.handle('runtimeLicense:getStatus', (0, ipcWrap_1.ipcWrap)(async (event, companyId) => {
        const ctx = (0, AuthContext_1.getContext)(event);
        ensurePermission(ctx, [
            'license.concurrent_user.monitor',
            'license.concurrent_user.allocate',
            'system.settings',
        ]);
        return concurrentLicenseService.getStatus(String(companyId || ctx.companyId || 'COMP_01'));
    }));
    electron_1.ipcMain.handle('runtimeLicense:setExtraSeats', (0, ipcWrap_1.ipcWrap)(async (event, payload) => {
        const ctx = (0, AuthContext_1.getContext)(event);
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
    electron_1.ipcMain.handle('runtimeLicense:heartbeat', (0, ipcWrap_1.ipcWrap)(async (event) => {
        const webContentsId = event?.sender?.id;
        if (webContentsId) {
            concurrentLicenseService.heartbeat(webContentsId);
        }
        return { success: true };
    }));
    electron_1.ipcMain.handle('attachments:startUpload', (0, ipcWrap_1.ipcWrap)(async (event, payload) => {
        const ctx = (0, AuthContext_1.getContext)(event);
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
    electron_1.ipcMain.handle('attachments:uploadChunk', (0, ipcWrap_1.ipcWrap)(async (event, payload) => {
        const ctx = (0, AuthContext_1.getContext)(event);
        const chunkIndex = Math.max(0, Math.floor(safeNumber(payload?.chunkIndex, 'chunkIndex')));
        return attachmentStorageService.uploadChunk(ctx, {
            sessionId: safeString(payload?.sessionId, 'sessionId'),
            chunkIndex,
            chunk: normalizeChunk(payload?.chunk),
            checksumSha256: payload?.checksumSha256 ? String(payload.checksumSha256) : undefined,
        });
    }));
    electron_1.ipcMain.handle('attachments:completeUpload', (0, ipcWrap_1.ipcWrap)(async (event, payload) => {
        const ctx = (0, AuthContext_1.getContext)(event);
        return attachmentStorageService.completeUpload(ctx, {
            sessionId: safeString(payload?.sessionId, 'sessionId'),
        });
    }));
    electron_1.ipcMain.handle('attachments:abortUpload', (0, ipcWrap_1.ipcWrap)(async (event, payload) => {
        const ctx = (0, AuthContext_1.getContext)(event);
        return attachmentStorageService.abortUpload(ctx, {
            sessionId: safeString(payload?.sessionId, 'sessionId'),
        });
    }));
    electron_1.ipcMain.handle('attachments:getQuota', (0, ipcWrap_1.ipcWrap)(async (event) => {
        const ctx = (0, AuthContext_1.getContext)(event);
        return attachmentStorageService.getQuota(ctx);
    }));
    electron_1.ipcMain.handle('attachments:updateTier', (0, ipcWrap_1.ipcWrap)(async (event, tier) => {
        const ctx = (0, AuthContext_1.getContext)(event);
        if (tier !== 'BASE_5GB' && tier !== 'EXT_10GB') {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Invalid quota tier');
        }
        return attachmentStorageService.updateTier(ctx, tier);
    }));
    electron_1.ipcMain.handle('attachments:addAddon', (0, ipcWrap_1.ipcWrap)(async (event, addonGb) => {
        const ctx = (0, AuthContext_1.getContext)(event);
        if (![10, 15, 25].includes(Number(addonGb))) {
            throw new errors_1.DomainError('VALIDATION_ERROR', 'Unsupported attachment add-on size');
        }
        return attachmentStorageService.addAddon(ctx, Number(addonGb));
    }));
    electron_1.ipcMain.handle('attachments:listFiles', (0, ipcWrap_1.ipcWrap)(async (event, payload) => {
        const ctx = (0, AuthContext_1.getContext)(event);
        return attachmentStorageService.listFiles(ctx, safeString(payload?.entityName, 'entityName'), safeString(payload?.entityId, 'entityId'));
    }));
    electron_1.ipcMain.handle('attachments:deleteFile', (0, ipcWrap_1.ipcWrap)(async (event, fileId) => {
        const ctx = (0, AuthContext_1.getContext)(event);
        return attachmentStorageService.deleteFile(ctx, safeString(fileId, 'fileId'));
    }));
}
