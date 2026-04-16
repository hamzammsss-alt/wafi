"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenQueryBuilder = void 0;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
class ScreenQueryBuilder {
    sanitizeFilters(definition, raw) {
        const items = Array.isArray(raw) ? raw : [];
        const schemaMap = new Map(definition.filterSchema.map((x) => [x.key, x]));
        const sanitized = [];
        for (const item of items) {
            if (!item || typeof item !== 'object')
                continue;
            const key = String(item.key || '').trim();
            if (!key)
                continue;
            const schema = schemaMap.get(key);
            if (!schema) {
                throw {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'error.views.filter_key_not_allowed',
                    message: `Filter key is not allowed: ${key}`,
                };
            }
            const operatorRaw = String(item.operator || schema.defaultOperator || '').trim().toLowerCase();
            const operator = operatorRaw;
            if (!schema.operatorSet.includes(operator)) {
                throw {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'error.views.filter_operator_not_allowed',
                    message: `Operator ${operator} is not allowed for ${key}`,
                };
            }
            const enabled = item.enabled !== false;
            sanitized.push({
                key,
                operator,
                value: item.value,
                valueTo: item.valueTo,
                enabled,
            });
        }
        return sanitized;
    }
    sanitizeColumns(definition, raw) {
        const defaults = definition.columnSchema.map((col, index) => ({
            key: col.key,
            visible: Boolean(col.defaultVisible),
            order: index,
            width: col.width,
        }));
        if (!Array.isArray(raw) || raw.length === 0) {
            return defaults;
        }
        const byKey = new Map();
        for (const item of raw) {
            if (!item || typeof item !== 'object')
                continue;
            const key = String(item.key || '').trim();
            if (!key)
                continue;
            const exists = definition.columnSchema.some((col) => col.key === key);
            if (!exists) {
                throw {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'error.views.column_key_not_allowed',
                    message: `Column key is not allowed: ${key}`,
                };
            }
            const visible = item.visible !== false;
            const orderRaw = Number(item.order);
            const order = Number.isFinite(orderRaw) ? Math.max(0, Math.floor(orderRaw)) : 999;
            const widthRaw = Number(item.width);
            const width = Number.isFinite(widthRaw) && widthRaw > 40 ? Math.floor(widthRaw) : undefined;
            byKey.set(key, { key, visible, order, width });
        }
        const merged = defaults.map((base, index) => {
            const incoming = byKey.get(base.key);
            if (!incoming)
                return base;
            return {
                key: base.key,
                visible: incoming.visible,
                order: Number.isFinite(incoming.order) ? incoming.order : index,
                width: incoming.width ?? base.width,
            };
        });
        merged.sort((a, b) => a.order - b.order);
        return merged.map((item, index) => ({ ...item, order: index }));
    }
    sanitizeSort(definition, raw) {
        const schemaKeys = new Set(definition.columnSchema.filter((x) => x.sortable).map((x) => x.key));
        const sortMap = definition.source.sortMap || {};
        const hasSortExpr = (key) => Boolean(sortMap[key]);
        const sanitized = [];
        const items = Array.isArray(raw) ? raw : [];
        for (const item of items) {
            if (!item || typeof item !== 'object')
                continue;
            const key = String(item.key || '').trim();
            if (!key)
                continue;
            if (!schemaKeys.has(key) || !hasSortExpr(key)) {
                throw {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'error.views.sort_key_not_allowed',
                    message: `Sort key is not allowed: ${key}`,
                };
            }
            const directionRaw = String(item.direction || 'asc').trim().toLowerCase();
            const direction = directionRaw === 'desc' ? 'desc' : 'asc';
            sanitized.push({ key, direction });
        }
        if (sanitized.length === 0) {
            for (const item of definition.defaultSort || []) {
                if (schemaKeys.has(item.key) && hasSortExpr(item.key)) {
                    sanitized.push({
                        key: item.key,
                        direction: item.direction === 'desc' ? 'desc' : 'asc',
                    });
                }
            }
        }
        if (sanitized.length === 0) {
            const firstSortable = definition.columnSchema.find((x) => x.sortable && hasSortExpr(x.key));
            if (firstSortable) {
                sanitized.push({ key: firstSortable.key, direction: 'asc' });
            }
        }
        return sanitized;
    }
    build(definition, input) {
        const appliedFilters = this.sanitizeFilters(definition, input.filters);
        const appliedColumns = this.sanitizeColumns(definition, input.columns);
        const appliedSort = this.sanitizeSort(definition, input.sort);
        const page = Math.max(1, Math.floor(Number(input.page || 1)));
        const pageSize = Math.max(1, Math.min(500, Math.floor(Number(input.pageSize || 100))));
        const offset = (page - 1) * pageSize;
        const limit = pageSize;
        const selectedKeys = appliedColumns.filter((x) => x.visible).map((x) => x.key);
        if (!selectedKeys.includes(definition.source.primaryKey)) {
            selectedKeys.unshift(definition.source.primaryKey);
        }
        const selectParts = selectedKeys.map((key) => {
            const expression = definition.source.selectMap[key];
            if (!expression) {
                throw {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'error.views.column_expression_missing',
                    message: `Missing select expression for ${key}`,
                };
            }
            return `${expression} AS "${key}"`;
        });
        const whereParts = [];
        const whereParams = [];
        if (definition.source.baseWhereSql && definition.source.baseWhereSql.trim()) {
            whereParts.push(`(${definition.source.baseWhereSql.trim()})`);
        }
        const filterSchemaByKey = new Map(definition.filterSchema.map((x) => [x.key, x]));
        for (const filter of appliedFilters) {
            if (filter.enabled === false)
                continue;
            const schema = filterSchemaByKey.get(filter.key);
            if (!schema)
                continue;
            this.appendFilterClause(whereParts, whereParams, schema.field, schema.type, filter.operator, filter.value, filter.valueTo);
        }
        const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
        const orderParts = appliedSort
            .map((sort) => {
            const expr = definition.source.sortMap[sort.key];
            if (!expr)
                return '';
            const dir = sort.direction === 'desc' ? 'DESC' : 'ASC';
            return `${expr} ${dir}`;
        })
            .filter(Boolean);
        const orderSql = orderParts.length ? `ORDER BY ${orderParts.join(', ')}` : '';
        const listSql = `
            SELECT ${selectParts.join(', ')}
            ${definition.source.fromSql}
            ${whereSql}
            ${orderSql}
            LIMIT ? OFFSET ?
        `;
        const listParams = [...whereParams, limit, offset];
        const countSql = `
            SELECT COUNT(1) AS total
            ${definition.source.fromSql}
            ${whereSql}
        `;
        const countParams = [...whereParams];
        return {
            listSql,
            listParams,
            countSql,
            countParams,
            appliedFilters,
            appliedColumns,
            appliedSort,
            limit,
            offset,
        };
    }
    appendFilterClause(whereParts, params, fieldExpression, type, operator, value, valueTo) {
        if (operator === 'is_null') {
            whereParts.push(`${fieldExpression} IS NULL`);
            return;
        }
        if (operator === 'not_null') {
            whereParts.push(`${fieldExpression} IS NOT NULL`);
            return;
        }
        if (operator === 'in') {
            const normalized = this.normalizeArrayValue(type, value);
            if (normalized.length === 0)
                return;
            const placeholders = normalized.map(() => '?').join(', ');
            whereParts.push(`${fieldExpression} IN (${placeholders})`);
            params.push(...normalized);
            return;
        }
        if (operator === 'between') {
            const left = this.normalizeValue(type, value);
            const right = this.normalizeValue(type, valueTo);
            if (left === null || right === null)
                return;
            whereParts.push(`${fieldExpression} BETWEEN ? AND ?`);
            params.push(left, right);
            return;
        }
        const normalized = this.normalizeValue(type, value);
        if (normalized === null)
            return;
        switch (operator) {
            case 'eq':
                whereParts.push(`${fieldExpression} = ?`);
                params.push(normalized);
                return;
            case 'neq':
                whereParts.push(`${fieldExpression} <> ?`);
                params.push(normalized);
                return;
            case 'gt':
                whereParts.push(`${fieldExpression} > ?`);
                params.push(normalized);
                return;
            case 'gte':
                whereParts.push(`${fieldExpression} >= ?`);
                params.push(normalized);
                return;
            case 'lt':
                whereParts.push(`${fieldExpression} < ?`);
                params.push(normalized);
                return;
            case 'lte':
                whereParts.push(`${fieldExpression} <= ?`);
                params.push(normalized);
                return;
            case 'contains': {
                const safe = this.escapeLike(String(normalized));
                whereParts.push(`${fieldExpression} LIKE ? ESCAPE '\\'`);
                params.push(`%${safe}%`);
                return;
            }
            case 'starts_with': {
                const safe = this.escapeLike(String(normalized));
                whereParts.push(`${fieldExpression} LIKE ? ESCAPE '\\'`);
                params.push(`${safe}%`);
                return;
            }
            case 'ends_with': {
                const safe = this.escapeLike(String(normalized));
                whereParts.push(`${fieldExpression} LIKE ? ESCAPE '\\'`);
                params.push(`%${safe}`);
                return;
            }
            default:
                throw {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'error.views.filter_operator_not_supported',
                    message: `Unsupported filter operator: ${operator}`,
                };
        }
    }
    normalizeArrayValue(type, value) {
        let values = [];
        if (Array.isArray(value)) {
            values = value;
        }
        else if (typeof value === 'string') {
            values = value.split(',').map((x) => x.trim()).filter(Boolean);
        }
        const normalized = values
            .map((item) => this.normalizeValue(type, item))
            .filter((item) => item !== null);
        return normalized.slice(0, 100);
    }
    normalizeValue(type, value) {
        if (value === undefined || value === null || value === '')
            return null;
        if (type === 'number') {
            const n = Number(value);
            if (!Number.isFinite(n)) {
                throw {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'error.views.filter_value_invalid_number',
                    message: `Invalid numeric value: ${value}`,
                };
            }
            return n;
        }
        if (type === 'boolean') {
            if (value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true')
                return 1;
            if (value === false || value === 0 || value === '0' || String(value).toLowerCase() === 'false')
                return 0;
            throw {
                code: 'VALIDATION_ERROR',
                messageKey: 'error.views.filter_value_invalid_boolean',
                message: `Invalid boolean value: ${value}`,
            };
        }
        if (type === 'date') {
            const text = String(value).trim();
            if (!DATE_RE.test(text)) {
                throw {
                    code: 'VALIDATION_ERROR',
                    messageKey: 'error.views.filter_value_invalid_date',
                    message: `Invalid date value: ${value}`,
                };
            }
            return text;
        }
        const text = String(value).trim();
        if (!text)
            return null;
        return text;
    }
    escapeLike(value) {
        return value.replace(/[\\%_]/g, (match) => `\\${match}`);
    }
}
exports.ScreenQueryBuilder = ScreenQueryBuilder;
