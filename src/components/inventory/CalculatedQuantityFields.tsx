import React from 'react';
import { Calculator, Hash, Ruler } from 'lucide-react';
import {
    QuantityDimensionsInput,
    UnitCalculationMode,
    getUnitCalculationRequirements,
    getUnitFormulaHint,
} from '../../lib/unit-calculations';

type DimensionField = 'length' | 'width' | 'height' | 'count';

interface CalculatedQuantityFieldsProps {
    mode: UnitCalculationMode;
    values: QuantityDimensionsInput;
    quantity: number;
    unitName?: string;
    onChange: (field: DimensionField, value: number) => void;
}

const FIELD_LABELS: Record<DimensionField, string> = {
    length: 'الطول',
    width: 'العرض',
    height: 'الارتفاع',
    count: 'العدد',
};

export const CalculatedQuantityFields: React.FC<CalculatedQuantityFieldsProps> = ({
    mode,
    values,
    quantity,
    unitName,
    onChange,
}) => {
    const requirements = getUnitCalculationRequirements(mode);
    const fields: DimensionField[] = [];

    if (requirements.requiresLength) fields.push('length');
    if (requirements.requiresWidth) fields.push('width');
    if (requirements.requiresHeight) fields.push('height');
    if (requirements.requiresCount) fields.push('count');

    return (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                        <Calculator size={16} />
                        حاسبة كمية الوحدة
                    </div>
                    <div className="mt-1 text-xs text-emerald-700">
                        {getUnitFormulaHint(mode)}
                        {unitName ? ` • ${unitName}` : ''}
                    </div>
                </div>
                <div className="rounded-lg bg-white px-3 py-2 text-center shadow-sm">
                    <div className="text-[11px] text-gray-500">الكمية المحسوبة</div>
                    <div className="font-mono text-lg font-bold text-emerald-700">{Number(quantity || 0).toFixed(6)}</div>
                </div>
            </div>

            <div className={`grid gap-3 ${fields.length > 2 ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
                {fields.map((field) => (
                    <label key={field} className="block">
                        <span className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-600">
                            {field === 'count' ? <Hash size={14} /> : <Ruler size={14} />}
                            {FIELD_LABELS[field]}
                            {field !== 'count' ? ' (متر)' : ''}
                        </span>
                        <input
                            type="number"
                            min="0"
                            step={field === 'count' ? '1' : '0.001'}
                            value={Number(values[field] ?? (field === 'count' ? 1 : 0))}
                            onChange={(event) => onChange(field, Number(event.target.value) || 0)}
                            className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        />
                    </label>
                ))}
            </div>
        </div>
    );
};

export default CalculatedQuantityFields;
