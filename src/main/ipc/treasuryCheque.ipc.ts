import { ipcMain } from 'electron';
import { ipcWrap } from '../core/ipcWrap';
import { withGuards } from './withGuards';
import { TreasuryChequeUseCases } from '../application/useCases/TreasuryChequeUseCases';
import {
    CancelChequeCommand,
    ClearIssuedChequeCommand,
    ClearReceivedChequeCommand,
    DepositChequeCommand,
    ReturnReceivedChequeCommand,
} from '../domain/treasury/types/TreasuryTypes';

const LEGACY_PERMISSIONS = {
    WRITE: ['treasury.update', 'ti.treasury.write', 'system.settings'],
    POST: ['treasury.post', 'DOC.POST', 'ti.treasury.post', 'system.settings'],
} as const;

export function registerTreasuryChequeIPC(useCases: TreasuryChequeUseCases): void {
    ipcMain.handle(
        'treasuryCheque.deposit',
        ipcWrap(
            withGuards(
                {
                    eventName: 'treasuryCheque.deposit',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: DepositChequeCommand) =>
                    useCases.deposit(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as DepositChequeCommand)),
            ),
        ),
    );

    ipcMain.handle(
        'treasuryCheque.clearReceived',
        ipcWrap(
            withGuards(
                {
                    eventName: 'treasuryCheque.clearReceived',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: ClearReceivedChequeCommand) =>
                    useCases.clearReceived(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as ClearReceivedChequeCommand)),
            ),
        ),
    );

    ipcMain.handle(
        'treasuryCheque.returnReceived',
        ipcWrap(
            withGuards(
                {
                    eventName: 'treasuryCheque.returnReceived',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: ReturnReceivedChequeCommand) =>
                    useCases.returnReceived(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as ReturnReceivedChequeCommand)),
            ),
        ),
    );

    ipcMain.handle(
        'treasuryCheque.clearIssued',
        ipcWrap(
            withGuards(
                {
                    eventName: 'treasuryCheque.clearIssued',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: ClearIssuedChequeCommand) =>
                    useCases.clearIssued(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as ClearIssuedChequeCommand)),
            ),
        ),
    );

    ipcMain.handle(
        'treasuryCheque.cancel',
        ipcWrap(
            withGuards(
                {
                    eventName: 'treasuryCheque.cancel',
                    legacyPermissions: [...LEGACY_PERMISSIONS.POST, ...LEGACY_PERMISSIONS.WRITE],
                },
                async (ctx, _event, payload: CancelChequeCommand) =>
                    useCases.cancel(ctx.companyId, ctx.branchId, ctx.userId, payload || ({} as CancelChequeCommand)),
            ),
        ),
    );
}