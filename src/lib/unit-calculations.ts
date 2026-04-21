import type { Unit } from '../../types';

export type UnitCalculationMode = 'MANUAL' | 'LINEAR' | 'AREA' | 'VOLUME';

export interface QuantityDimensionsInput {
    length?: number;
    width?: number;
    height?: number;
    count?: number;
}

const VOLUME_CODES = new Set(['CBM', 'M3', 'CM3', 'MM3']);
const AREA_CODES = new Set(['SQM', 'M2', 'CM2', 'MM2']);
const LINEAR_CODES = new Set(['M', 'MTR', 'CM', 'MM', 'KM']);

const normalizeText = (value: unknown) => String(value ?? '').trim().toLowerCase();

export const normalizeUnitCalculationMode = (value: unknown): UnitCalculationMode => {
    const normalized = String(value ?? '').trim().toUpperCase();
    if (normalized === 'LINEAR' || normalized === 'AREA' || normalized === 'VOLUME') {
        return normalized;
    }
    return 'MANUAL';
};

export const inferUnitCalculationMode = (unit: Partial<Unit> | null | undefined): UnitCalculationMode => {
    const code = String(unit?.code || '').trim().toUpperCase();
    const searchable = normalizeText([unit?.name_ar, unit?.name_en, unit?.unit_type, unit?.formula_hint].filter(Boolean).join(' '));

    if (
        VOLUME_CODES.has(code) ||
        searchable.includes('متر مكعب') ||
        searchable.includes('مكعب') ||
        searchable.includes('cubic')
    ) {
        return 'VOLUME';
    }

    if (
        AREA_CODES.has(code) ||
        searchable.includes('متر مربع') ||
        searchable.includes('مربع') ||
        searchable.includes('square')
    ) {
        return 'AREA';
    }

    if (
        LINEAR_CODES.has(code) ||
        searchable.includes('متر') ||
        searchable.includes('سنتيمتر') ||
        searchable.includes('مليمتر') ||
        searchable.includes('kilometer') ||
        searchable.includes('meter')
    ) {
        return 'LINEAR';
    }

    return 'MANUAL';
};

export const getUnitCalculationMode = (unit: Partial<Unit> | null | undefined): UnitCalculationMode => {
    const explicit = normalizeUnitCalculationMode(unit?.calculation_mode);
    if (explicit !== 'MANUAL') return explicit;
    return inferUnitCalculationMode(unit);
};

export const isCalculatedUnit = (unit: Partial<Unit> | null | undefined): boolean =>
    getUnitCalculationMode(unit) !== 'MANUAL';

export const getUnitCalculationRequirements = (mode: UnitCalculationMode) => ({
    requiresLength: mode === 'LINEAR' || mode === 'AREA' || mode === 'VOLUME',
    requiresWidth: mode === 'AREA' || mode === 'VOLUME',
    requiresHeight: mode === 'VOLUME',
    requiresCount: mode === 'LINEAR' || mode === 'AREA' || mode === 'VOLUME',
});

export const getUnitFormulaHint = (mode: UnitCalculationMode): string => {
    if (mode === 'LINEAR') return 'الكمية = الطول × العدد';
    if (mode === 'AREA') return 'الكمية = الطول × العرض × العدد';
    if (mode === 'VOLUME') return 'الكمية = الطول × العرض × الارتفاع × العدد';
    return 'إدخال يدوي';
};

export const calculateUnitQuantity = (
    mode: UnitCalculationMode,
    input: QuantityDimensionsInput,
): number => {
    const length = Number(input.length) > 0 ? Number(input.length) : 0;
    const width = Number(input.width) > 0 ? Number(input.width) : 0;
    const height = Number(input.height) > 0 ? Number(input.height) : 0;
    const count = Number(input.count) > 0 ? Number(input.count) : 1;

    if (mode === 'LINEAR') return roundCalculatedQuantity(length * count);
    if (mode === 'AREA') return roundCalculatedQuantity(length * width * count);
    if (mode === 'VOLUME') return roundCalculatedQuantity(length * width * height * count);
    return 0;
};

export const roundCalculatedQuantity = (value: number): number => {
    if (!Number.isFinite(value)) return 0;
    return Math.round(value * 1_000_000) / 1_000_000;
};
