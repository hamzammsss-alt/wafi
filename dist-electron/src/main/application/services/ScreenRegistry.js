"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenRegistry = void 0;
const screenRegistry_1 = require("../../../config/screenRegistry");
class ScreenRegistry {
    get(screenKey) {
        return (0, screenRegistry_1.getScreenDefinition)(screenKey);
    }
    require(screenKey) {
        const definition = this.get(screenKey);
        if (!definition) {
            throw {
                code: 'VALIDATION_ERROR',
                messageKey: 'error.views.screen_not_registered',
                message: `Screen definition not found for ${screenKey}`,
            };
        }
        return definition;
    }
    list() {
        return (0, screenRegistry_1.listScreenDefinitions)();
    }
    getFilterSchema(screenKey) {
        return this.require(screenKey).filterSchema;
    }
    getColumnSchema(screenKey) {
        return this.require(screenKey).columnSchema;
    }
}
exports.ScreenRegistry = ScreenRegistry;
