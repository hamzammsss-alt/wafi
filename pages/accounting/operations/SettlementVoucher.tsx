import React from 'react';
import { JournalVoucher } from './JournalVoucher';

export const SettlementVoucher = () => {
    return (
        <div className="h-full flex flex-col relative">
            <div className="bg-orange-50 border-b border-orange-100 p-2 text-center text-xs font-bold text-orange-800">
                ⚠️ وضع قيود التسوية (Settlement Entries) - سيتم تصنيف القيود كنوع "تسووي"
            </div>
            <JournalVoucher />
        </div>
    );
};
