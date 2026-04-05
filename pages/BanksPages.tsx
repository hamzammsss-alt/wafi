
import React, { useState } from 'react';
import { GenericDocument } from '../components/GenericDocument';
import { GenericMasterData } from '../components/GenericMasterData';
import { Landmark, CheckSquare, RefreshCcw } from 'lucide-react';

// Bank Deposit is a document (Cash -> Bank)
export const BankDeposit = () => (
    <GenericDocument
        title="سند إيداع بنكي (Bank Deposit)"
        documentName="سند الإيداع"
        type="INVENTORY" // Using inventory style as it's internal transfer-ish
        accountLabel="الحساب البنكي المودع فيه"
        colorTheme="blue"
        prefix="DEP"
    />
);

export const BankWithdrawal = () => (
    <GenericDocument
        title="سند سحب بنكي (Bank Withdrawal)"
        documentName="سند السحب"
        type="INVENTORY"
        accountLabel="الحساب البنكي المسحوب منه"
        colorTheme="blue"
        prefix="WDR"
    />
);

export const BankAccounts = () => (
    <GenericMasterData
        title="حساباتنا في البنوك"
        icon={<Landmark className="text-blue-600" />}
        columns={[
            { key: 'bank_name', label: 'اسم البنك' },
            { key: 'account_no', label: 'رقم الحساب' },
            { key: 'currency', label: 'العملة' },
            { key: 'branch', label: 'الفرع' }
        ]}
        initialData={[
            { id: 1, bank_name: 'بنك فلسطين', account_no: '123456', currency: 'ILS', branch: 'رام الله' },
            { id: 2, bank_name: 'البنك العربي', account_no: '987654', currency: 'USD', branch: 'الماصيون' }
        ]}
    />
);

export const BankReconcile = () => {
    return (
        <div className="p-6 bg-[#f0f2f5] min-h-screen">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <RefreshCcw className="text-blue-600" /> مطابقة كشف البنك (Reconciliation)
            </h1>
            <div className="bg-white p-8 rounded shadow text-center text-gray-500">
                <p>هنا ستتم مطابقة الحركات المسجلة في النظام مع كشف الحساب البنكي المستورد (Excel/MT940).</p>
            </div>
        </div>
    );
};

export const IssuedChecks = () => {
    return (
        <div className="p-6 bg-[#f0f2f5] min-h-screen">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <CheckSquare className="text-red-600" /> الشيكات الصادرة (Issued Checks)
            </h1>
            <div className="bg-white p-8 rounded shadow text-center text-gray-500">
                <p>تقرير وتتبع حالة الشيكات التي أصدرناها للموردين (تحت التحصيل، مصروفة، راجعة).</p>
            </div>
        </div>
    );
};
