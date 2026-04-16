import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import { withGuards } from './withGuards';
import { TreasuryDocumentUseCases } from '../application/useCases/TreasuryDocumentUseCases';
import {
    CreateTreasuryDocumentInput,
    ReverseTreasuryDocumentCommand,
    UpdateTreasuryDocumentInput,
} from '../domain/treasury/types/TreasuryTypes';

const LEGACY_PERMISSIONS = {
    READ: ['treasury.view', 'ti.treasury.read', 'system.settings'],
    WRITE: ['treasury.create', 'treasury.update', 'ti.treasury.write', 'system.settings'],
    POST: ['treasury.post', 'DOC.POST', 'ti.treasury.post', 'system.settings'],
} as const;

export function registerTreasuryDocumentIPC(useCases: TreasuryDocumentUseCases): void {
    ipcMain.handle(
        'treasuryDocument.create',
        ipcWrap(
            withGuards(
                {
                    eventName: 'treasuryDocument.create',
                    legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: CreateTreasuryDocumentInput) =>
                    useCases.create(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CreateTreasuryDocumentInput)),
            ),
        ),
    );

    ipcMain.handle(
        'treasuryDocument.update',
        ipcWrap(
            withGuards(
                {
                    eventName: 'treasuryDocument.update',
                    legacyPermissions: [...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: UpdateTreasuryDocumentInput) =>
                    useCases.update(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as UpdateTreasuryDocumentInput)),
            ),
        ),
    );

    ipcMain.handle(
        'treasuryDocument.getById',
        ipcWrap(
            withGuards(
                {
                    eventName: 'treasuryDocument.getById',
                    legacyPermissions: [...LEGACY_PERMISSIONS.READ],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.getById(ctx.companyId, ctx.branchId, String(documentId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'treasuryDocument.post',
        ipcWrap(
            withGuards(
                {
                    eventName: 'treasuryDocument.post',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.post(ctx.companyId, ctx.branchId, ctx.userId, String(documentId || '').trim()),
            ),
        ),
    );

    ipcMain.handle(
        'treasuryDocument.reverse',
        ipcWrap(
            withGuards(
                {
                    eventName: 'treasuryDocument.reverse',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: ReverseTreasuryDocumentCommand) =>
                    useCases.reverse(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as ReverseTreasuryDocumentCommand)),
            ),
        ),
    );

    ipcMain.handle(
        'treasuryDocument.getPostingStatus',
        ipcWrap(
            withGuards(
                {
                    eventName: 'treasuryDocument.getPostingStatus',
                    legacyPermissions: [...LEGACY_PERMISSIONS.READ],
                },
                async (ctx, _event, documentId: string) =>
                    useCases.getPostingStatus(ctx.companyId, ctx.branchId, String(documentId || '').trim()),
            ),
        ),
    );
}