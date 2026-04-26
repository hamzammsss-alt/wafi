import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import { SystemSettingsService } from '../application/services/SystemSettingsService';
import { withGuards } from './withGuards';

const SETTINGS_READ_CAPABILITY = 'core.settings.read';
const SETTINGS_MANAGE_CAPABILITY = 'core.settings.manage';
const SETTINGS_LEGACY_READ = ['system.settings', 'settings.read'];
const SETTINGS_LEGACY_MANAGE = ['system.settings', 'settings.manage'];

export function registerSettingsIPC(service: SystemSettingsService) {
    ipcMain.handle(
        'settings:getAll',
        ipcWrap(
            withGuards(
                {
                    eventName: 'settings.getAll',
                    requiredCapabilities: [SETTINGS_READ_CAPABILITY],
                    legacyPermissions: SETTINGS_LEGACY_READ,
                },
                async (ctx, _event, scope) => service.getAll(ctx, scope || {}),
            ),
        ),
    );

    ipcMain.handle(
        'settings:getSection',
        ipcWrap(
            withGuards(
                {
                    eventName: 'settings.getSection',
                    requiredCapabilities: [SETTINGS_READ_CAPABILITY],
                    legacyPermissions: SETTINGS_LEGACY_READ,
                },
                async (ctx, _event, sectionCode: string, scope) => service.getSection(sectionCode, ctx, scope || {}),
            ),
        ),
    );

    ipcMain.handle(
        'settings:putSection',
        ipcWrap(
            withGuards(
                {
                    eventName: 'settings.putSection',
                    requiredCapabilities: [SETTINGS_MANAGE_CAPABILITY],
                    legacyPermissions: SETTINGS_LEGACY_MANAGE,
                },
                async (ctx, _event, sectionCode: string, values: Record<string, unknown>, scope) =>
                    service.putSection(sectionCode, values || {}, ctx, scope || {}),
            ),
        ),
    );

    ipcMain.handle(
        'settings:patchKey',
        ipcWrap(
            withGuards(
                {
                    eventName: 'settings.patchKey',
                    requiredCapabilities: [SETTINGS_MANAGE_CAPABILITY],
                    legacyPermissions: SETTINGS_LEGACY_MANAGE,
                },
                async (ctx, _event, key: string, value: unknown, scope) =>
                    service.patchKey(key, value, ctx, scope || {}),
            ),
        ),
    );

    ipcMain.handle(
        'settings:getLegacyRows',
        ipcWrap(
            withGuards(
                {
                    eventName: 'settings.getLegacyRows',
                    requiredCapabilities: [SETTINGS_READ_CAPABILITY],
                    legacyPermissions: SETTINGS_LEGACY_READ,
                },
                async (ctx, _event, scope) => service.getLegacySettingsRows(ctx, scope || {}),
            ),
        ),
    );

    ipcMain.handle(
        'settings:saveLegacySetting',
        ipcWrap(
            withGuards(
                {
                    eventName: 'settings.saveLegacySetting',
                    requiredCapabilities: [SETTINGS_MANAGE_CAPABILITY],
                    legacyPermissions: SETTINGS_LEGACY_MANAGE,
                },
                async (ctx, _event, key: string, value: unknown, scope) =>
                    service.saveLegacySetting(key, value, ctx, scope || {}),
            ),
        ),
    );

    ipcMain.handle(
        'settings:auditLogs',
        ipcWrap(
            withGuards(
                {
                    eventName: 'settings.auditLogs',
                    requiredCapabilities: [SETTINGS_MANAGE_CAPABILITY],
                    legacyPermissions: SETTINGS_LEGACY_MANAGE,
                },
                async (_ctx, _event, limit?: number) => service.listAuditLogs(limit || 200),
            ),
        ),
    );
}

