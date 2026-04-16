import { ipcMain } from 'electron';
import { ScreenViewsService } from '../application/services/ScreenViewsService';
import { ipcWrap } from '../core/ipcWrap';
import { withGuards } from './withGuards';

const VIEW_MANAGE_CAPABILITY = 'view.manage';

export function registerScreenViewsIPC(service: ScreenViewsService) {
    ipcMain.handle(
        'views.list',
        ipcWrap(
            withGuards(
                {
                    eventName: 'views.list',
                },
                async (ctx, _event, screenKey: string) => {
                    return service.listViews(ctx, screenKey);
                },
            ),
        ),
    );

    ipcMain.handle(
        'views.apply',
        ipcWrap(
            withGuards(
                {
                    eventName: 'views.apply',
                },
                async (ctx, _event, payload: any) => {
                    return service.apply(ctx, payload || {});
                },
            ),
        ),
    );

    ipcMain.handle(
        'views.save',
        ipcWrap(
            withGuards(
                {
                    eventName: 'views.save',
                    requiredCapabilities: [VIEW_MANAGE_CAPABILITY],
                },
                async (ctx, _event, payload: any) => {
                    return service.saveView(ctx, payload || {});
                },
            ),
        ),
    );

    ipcMain.handle(
        'views.setDefault',
        ipcWrap(
            withGuards(
                {
                    eventName: 'views.setDefault',
                    requiredCapabilities: [VIEW_MANAGE_CAPABILITY],
                },
                async (ctx, _event, viewId: string) => {
                    return service.setDefault(ctx, viewId);
                },
            ),
        ),
    );

    ipcMain.handle(
        'views.delete',
        ipcWrap(
            withGuards(
                {
                    eventName: 'views.delete',
                    requiredCapabilities: [VIEW_MANAGE_CAPABILITY],
                },
                async (ctx, _event, viewId: string) => {
                    return service.deleteView(ctx, viewId);
                },
            ),
        ),
    );
}
