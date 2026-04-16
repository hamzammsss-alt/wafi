import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import { JournalUseCases } from '../application/useCases/JournalUseCases';
import { withGuards } from './withGuards';
import { getGlobalAuditService } from '../application/services/AuditService';
import { AuditContext } from '../domain/audit/AuditTypes';

export function registerJournalIPC(useCases: JournalUseCases) {
    const createAuditContext = (ctx: any, event: Electron.IpcMainInvokeEvent): AuditContext => {
        const ipcid = String(event?.sender?.id || '');
        return {
            companyId: String(ctx?.companyId || 'COMP_01'),
            branchId: String(ctx?.branchId || 'BR_01'),
            userId: String(ctx?.userId || 'SYSTEM'),
            sessionId: String(ctx?.sessionId || ipcid || ''),
            correlationId: String(ctx?.correlationId || ''),
            ipcid,
        };
    };

    const recordAudit = (
        ctx: any,
        event: Electron.IpcMainInvokeEvent,
        payload: {
            entityId: string;
            eventType: string;
            summaryI18nKey: string;
            meta?: Record<string, unknown>;
        },
    ) => {
        const auditService = getGlobalAuditService();
        if (!auditService) return;
        try {
            auditService.recordEvent(
                createAuditContext(ctx, event),
                {
                    entityType: 'journal_voucher',
                    entityId: payload.entityId,
                    docType: 'journal_voucher',
                    docId: payload.entityId,
                    eventType: payload.eventType,
                    summaryI18nKey: payload.summaryI18nKey,
                    meta: payload.meta || null,
                    correlationId: String(ctx?.correlationId || ''),
                    ipcid: String(event?.sender?.id || ''),
                },
                [],
            );
        } catch (error) {
            console.warn('[journals.ipc] audit record failed:', error);
        }
    };

    const toDTO = (j: any) => ({
        header: {
            id: j.id,
            companyId: j.companyId,
            branchId: j.branchId,
            number: j.number,
            date: j.date,
            reference: j.reference,
            notes: j.notes,
            status: j.status,
            createdAt: j.createdAt,
            updatedAt: j.updatedAt,
            postedAt: j.postedAt
        },
        lines: j.lines.map((l: any) => ({
            id: l.id,
            accountId: l.accountId.value || l.accountId,
            debit: l.debit,
            credit: l.credit,
            memo: l.memo,
            currencyId: l.currencyId || null,
            exchangeRate: l.exchangeRate ?? null,
            foreignDebit: l.foreignDebit ?? null,
            foreignCredit: l.foreignCredit ?? null,
            branchId: l.branchId || null,
            costCenterId: l.costCenterId || null,
            expenseTypeId: l.expenseTypeId || null,
            vehicleId: l.vehicleId || null,
            partnerId: l.partnerId || null,
            projectId: l.projectId || null,
        }))
    });

    ipcMain.handle(
        'journals:createDraft',
        ipcWrap(
            withGuards(
                {
                    eventName: 'journals.createDraft',
                    requiredCapabilities: ['accounting.journal_voucher.create'],
                    legacyPermissions: ['accounting.journal.create', 'gl.create', 'accounting.edit'],
                },
                async (ctx) => {
                    const journal = await useCases.createDraft(ctx.companyId, ctx.branchId);
                    return toDTO(journal);
                },
            ),
        ),
    );

    ipcMain.handle(
        'journals:save',
        ipcWrap(
            withGuards(
                {
                    eventName: 'journals.save',
                    requiredCapabilities: ['accounting.journal_voucher.update'],
                    legacyPermissions: ['accounting.journal.update', 'gl.edit', 'accounting.edit'],
                },
                async (ctx, event, data: any) => {
                    const journal = await useCases.saveDraft(ctx.companyId, data.id, data.header, data.lines);
                    recordAudit(ctx, event, {
                        entityId: String(data?.id || journal?.id || ''),
                        eventType: 'document.update',
                        summaryI18nKey: 'audit.event.document.update',
                        meta: { action: 'save' },
                    });
                    return toDTO(journal);
                },
            ),
        ),
    );

    ipcMain.handle(
        'journals:get',
        ipcWrap(
            withGuards(
                {
                    eventName: 'journals.get',
                    requiredCapabilities: ['accounting.journal_voucher.read'],
                    legacyPermissions: ['accounting.journal.read', 'gl.view', 'accounting.view'],
                },
                async (ctx, _event, id: string) => {
                    const journal = await useCases.get(ctx.companyId, id);
                    return journal ? toDTO(journal) : null;
                },
            ),
        ),
    );

    ipcMain.handle(
        'journals:list',
        ipcWrap(
            withGuards(
                {
                    eventName: 'journals.list',
                    requiredCapabilities: ['accounting.journal_voucher.read'],
                    legacyPermissions: ['accounting.journal.read', 'gl.view', 'accounting.view'],
                },
                async (ctx, _event, cursor: any) => {
                    const result = await useCases.list(ctx.companyId, cursor);
                    return {
                        rows: result.rows.map((row) => toDTO(row).header),
                        nextCursor: result.nextCursor,
                    };
                },
            ),
        ),
    );

    ipcMain.handle(
        'journals:post',
        ipcWrap(
            withGuards(
                {
                    eventName: 'journals.post',
                    requiredCapabilities: ['accounting.journal_voucher.post', 'accounting.journal_voucher.update'],
                    legacyPermissions: ['accounting.journal.post', 'gl.post', 'JOURNAL_POST', 'ti.gl.journal.post', 'DOC.POST'],
                    policyGuard: () => true,
                },
                async (ctx, event, id: string) => {
                    const journal = await useCases.postJournal(ctx.companyId, id);
                    recordAudit(ctx, event, {
                        entityId: String(id || ''),
                        eventType: 'document.post',
                        summaryI18nKey: 'audit.event.document.post',
                        meta: { action: 'post' },
                    });
                    return toDTO(journal);
                },
            ),
        ),
    );
}
