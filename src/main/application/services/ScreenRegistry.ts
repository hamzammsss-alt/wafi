import {
    ColumnSchema,
    FilterSchema,
    ScreenDefinition,
    ScreenKey,
    getScreenDefinition,
    listScreenDefinitions,
} from '../../../config/screenRegistry';

export class ScreenRegistry {
    get(screenKey: ScreenKey): ScreenDefinition | null {
        return getScreenDefinition(screenKey);
    }

    require(screenKey: ScreenKey): ScreenDefinition {
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

    list(): ScreenDefinition[] {
        return listScreenDefinitions();
    }

    getFilterSchema(screenKey: ScreenKey): FilterSchema[] {
        return this.require(screenKey).filterSchema;
    }

    getColumnSchema(screenKey: ScreenKey): ColumnSchema[] {
        return this.require(screenKey).columnSchema;
    }
}
