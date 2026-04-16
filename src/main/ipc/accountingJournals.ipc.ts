import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import { withGuards } from './withGuards';
import {
    GetBySourceInput,
    JournalEngineUseCases,
    PostJournalInput,
    ReverseJournalInput,
} from '../application/useCases/JournalEngineUseCases';

const CAPABILITY = {
    READ: 'accounting.journal_voucher.read',
    POST: 'accounting.journal_voucher.post',
    UPDATE: 'accounting.journal_voucher.update',
} as const;

export function registerAccountingJournalsIPC(useCases: JournalEngineUseCases): void {
    ipcMain.handle(
        'accounting.journals.post',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accounting.journals.post',
                    requiredCapabilities: [CAPABILITY.POST, CAPABILITY.UPDATE],
                    legacyPermissions: ['JOURNAL_POST', 'gl.post', 'DOC.POST', 'ti.gl.journal.post'],
                },
                async (ctx, _event, payload: PostJournalInput) => {
                    return useCases.postJournal(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as PostJournalInput));
                },
            ),
        ),
    );

    ipcMain.handle(
        'accounting.journals.reverse',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accounting.journals.reverse',
                    requiredCapabilities: [CAPABILITY.POST, CAPABILITY.UPDATE],
                    legacyPermissions: ['JOURNAL_POST', 'gl.post', 'DOC.POST', 'ti.gl.journal.post'],
                },
                async (ctx, _event, payload: ReverseJournalInput) => {
                    return useCases.reverseJournal(ctx.companyId, ctx.userId, payload || ({} as ReverseJournalInput));
                },
            ),
        ),
    );

    ipcMain.handle(
        'accounting.journals.getBySource',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accounting.journals.getBySource',
                    requiredCapabilities: [CAPABILITY.READ],
                    legacyPermissions: ['accounting.journal.read', 'gl.view', 'accounting.view', 'JOURNAL_POST'],
                },
                async (ctx, _event, payload: GetBySourceInput) => {
                    return useCases.getBySource(ctx.companyId, payload || ({} as GetBySourceInput));
                },
            ),
        ),
    );

    ipcMain.handle(
        'accounting.journals.getById',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accounting.journals.getById',
                    requiredCapabilities: [CAPABILITY.READ],
                    legacyPermissions: ['accounting.journal.read', 'gl.view', 'accounting.view', 'JOURNAL_POST'],
                },
                async (ctx, _event, journalId: string) => {
                    return useCases.getById(ctx.companyId, String(journalId || '').trim());
                },
            ),
        ),
    );

    ipcMain.handle(
        'accounting.journals.previewValidation',
        ipcWrap(
            withGuards(
                {
                    eventName: 'accounting.journals.previewValidation',
                    requiredCapabilities: [CAPABILITY.POST, CAPABILITY.UPDATE],
                    legacyPermissions: ['JOURNAL_POST', 'gl.post', 'DOC.POST', 'ti.gl.journal.post'],
                },
                async (ctx, _event, payload: PostJournalInput) => {
                    return useCases.previewValidation(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as PostJournalInput));
                },
            ),
        ),
    );
}
