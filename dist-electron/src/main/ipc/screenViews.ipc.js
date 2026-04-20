"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerScreenViewsIPC = registerScreenViewsIPC;
const electron_1 = require("electron");
const ipcWrap_1 = require("../core/ipcWrap");
const withGuards_1 = require("./withGuards");
const VIEW_MANAGE_CAPABILITY = 'view.manage';
function registerScreenViewsIPC(service) {
    electron_1.ipcMain.handle('views.list', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'views.list',
    }, async (ctx, _event, screenKey) => {
        return service.listViews(ctx, screenKey);
    })));
    electron_1.ipcMain.handle('views.apply', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'views.apply',
    }, async (ctx, _event, payload) => {
        return service.apply(ctx, payload || {});
    })));
    electron_1.ipcMain.handle('views.save', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'views.save',
        requiredCapabilities: [VIEW_MANAGE_CAPABILITY],
    }, async (ctx, _event, payload) => {
        return service.saveView(ctx, payload || {});
    })));
    electron_1.ipcMain.handle('views.setDefault', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'views.setDefault',
        requiredCapabilities: [VIEW_MANAGE_CAPABILITY],
    }, async (ctx, _event, viewId) => {
        return service.setDefault(ctx, viewId);
    })));
    electron_1.ipcMain.handle('views.delete', (0, ipcWrap_1.ipcWrap)((0, withGuards_1.withGuards)({
        eventName: 'views.delete',
        requiredCapabilities: [VIEW_MANAGE_CAPABILITY],
    }, async (ctx, _event, viewId) => {
        return service.deleteView(ctx, viewId);
    })));
}
