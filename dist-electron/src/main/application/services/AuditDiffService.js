"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diffPlainObjects = diffPlainObjects;
exports.diffLineArrays = diffLineArrays;
exports.diffDocumentPayload = diffDocumentPayload;
const DEFAULT_IGNORED = new Set([
    'updated_at',
    'updatedAt',
    'created_at',
    'createdAt',
]);
function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function deepEqual(left, right) {
    if (left === right)
        return true;
    if (left === null || left === undefined || right === null || right === undefined)
        return left === right;
    if (Array.isArray(left) && Array.isArray(right)) {
        if (left.length !== right.length)
            return false;
        for (let i = 0; i < left.length; i += 1) {
            if (!deepEqual(left[i], right[i]))
                return false;
        }
        return true;
    }
    if (isPlainObject(left) && isPlainObject(right)) {
        const leftKeys = Object.keys(left);
        const rightKeys = Object.keys(right);
        if (leftKeys.length !== rightKeys.length)
            return false;
        for (const key of leftKeys) {
            if (!rightKeys.includes(key))
                return false;
            if (!deepEqual(left[key], right[key]))
                return false;
        }
        return true;
    }
    return false;
}
function normalizeKeyHint(line, index) {
    const candidates = ['line_id', 'lineId', 'id', 'line_no', 'lineNo'];
    for (const key of candidates) {
        const value = line[key];
        if (value !== null && value !== undefined && String(value).trim()) {
            return String(value);
        }
    }
    return String(index + 1);
}
function pushChange(target, item, maxChanges) {
    if (target.length >= maxChanges)
        return;
    target.push(item);
}
function internalDiffObjects(before, after, opts, output, currentPath) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
        if (opts.ignoreKeys.includes(key))
            continue;
        const nextPath = currentPath ? `${currentPath}.${key}` : key;
        const left = before[key];
        const right = after[key];
        if (deepEqual(left, right))
            continue;
        if (isPlainObject(left) && isPlainObject(right)) {
            internalDiffObjects(left, right, opts, output, nextPath);
            continue;
        }
        pushChange(output, {
            fieldPath: nextPath,
            oldValue: left,
            newValue: right,
        }, opts.maxChanges);
    }
}
function diffPlainObjects(beforeValue, afterValue, options) {
    const opts = {
        basePath: options?.basePath || '',
        ignoreKeys: [
            ...Array.from(DEFAULT_IGNORED),
            ...(Array.isArray(options?.ignoreKeys) ? options.ignoreKeys : []),
        ],
        maxChanges: Math.max(1, Math.min(Number(options?.maxChanges || 250), 2000)),
    };
    const before = isPlainObject(beforeValue) ? beforeValue : {};
    const after = isPlainObject(afterValue) ? afterValue : {};
    const output = [];
    internalDiffObjects(before, after, opts, output, opts.basePath);
    return output;
}
function diffLineArrays(beforeLines, afterLines, options) {
    const before = Array.isArray(beforeLines) ? beforeLines : [];
    const after = Array.isArray(afterLines) ? afterLines : [];
    const maxChanges = Math.max(1, Math.min(Number(options?.maxChanges || 500), 3000));
    const beforeMap = new Map();
    const afterMap = new Map();
    before.forEach((line, index) => {
        if (!isPlainObject(line))
            return;
        beforeMap.set(normalizeKeyHint(line, index), line);
    });
    after.forEach((line, index) => {
        if (!isPlainObject(line))
            return;
        afterMap.set(normalizeKeyHint(line, index), line);
    });
    const keys = new Set([...beforeMap.keys(), ...afterMap.keys()]);
    const output = [];
    for (const key of keys) {
        if (output.length >= maxChanges)
            break;
        const left = beforeMap.get(key);
        const right = afterMap.get(key);
        if (!left && right) {
            const addDiff = diffPlainObjects({}, right, {
                basePath: `lines[${key}]`,
                ignoreKeys: options?.ignoreKeys,
                maxChanges: maxChanges - output.length,
            });
            output.push(...addDiff);
            continue;
        }
        if (left && !right) {
            const deleteDiff = diffPlainObjects(left, {}, {
                basePath: `lines[${key}]`,
                ignoreKeys: options?.ignoreKeys,
                maxChanges: maxChanges - output.length,
            });
            output.push(...deleteDiff);
            continue;
        }
        if (left && right) {
            const lineDiff = diffPlainObjects(left, right, {
                basePath: `lines[${key}]`,
                ignoreKeys: options?.ignoreKeys,
                maxChanges: maxChanges - output.length,
            });
            output.push(...lineDiff);
        }
    }
    return output.slice(0, maxChanges);
}
function diffDocumentPayload(beforeHeader, afterHeader, beforeLines, afterLines) {
    const headerDiff = diffPlainObjects(beforeHeader, afterHeader, {
        basePath: 'header',
        maxChanges: 250,
    });
    const lineDiff = diffLineArrays(beforeLines, afterLines, {
        maxChanges: 500,
    });
    return [...headerDiff, ...lineDiff].slice(0, 1000);
}
