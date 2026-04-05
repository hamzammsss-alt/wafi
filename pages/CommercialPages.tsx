
import React from 'react';
import { GenericDocument } from '../components/GenericDocument';

// --- Sales ---
export const Quotations = () => (
    <GenericDocument
        title="عرض سعر (Quotation)"
        documentName="عرض السعر"
        type="SALES"
        accountLabel="العميل"
        colorTheme="blue"
        prefix="QOT"
    />
);

export const SalesOrders = () => (
    <GenericDocument
        title="طلبية مبيعات (Sales Order)"
        documentName="الطلبية"
        type="SALES"
        accountLabel="العميل"
        colorTheme="blue"
        prefix="SO"
    />
);

export const DeliveryNote = () => (
    <GenericDocument
        title="إرسالية مبيعات (Delivery Note)"
        documentName="الإرسالية"
        type="INVENTORY" // Moves inventory but no money visual usually
        accountLabel="العميل"
        colorTheme="blue"
        prefix="DN"
    />
);

export const ManualInvoice = () => (
    <GenericDocument
        title="فاتورة مبيعات يدوية"
        documentName="الفاتورة"
        type="SALES"
        accountLabel="العميل"
        colorTheme="blue"
        prefix="MAN"
    />
);

export const SalesReturn = () => (
    <GenericDocument
        title="مرتجع مبيعات (Return)"
        documentName="إشعار المرتجع"
        type="SALES"
        accountLabel="العميل"
        colorTheme="red"
        prefix="SR"
    />
);

// --- Purchases ---
export const PurchaseRequest = () => (
    <GenericDocument
        title="طلب شراء (Purchase Request)"
        documentName="طلب الشراء"
        type="PURCHASE"
        accountLabel="المورد المقترح"
        colorTheme="orange"
        prefix="PRQ"
    />
);

export const PurchaseOrders = () => (
    <GenericDocument
        title="طلبية شراء (Purchase Order)"
        documentName="طلبية الشراء"
        type="PURCHASE"
        accountLabel="المورد"
        colorTheme="orange"
        prefix="PO"
    />
);

export const GoodsReceipt = () => (
    <GenericDocument
        title="سند استلام بضاعة (GRN)"
        documentName="سند الاستلام"
        type="INVENTORY"
        accountLabel="المورد"
        colorTheme="orange"
        prefix="GRN"
    />
);

export const ExpensesInvoice = () => (
    <GenericDocument
        title="فاتورة مصاريف (Expenses Invoice)"
        documentName="فاتورة المصاريف"
        type="PURCHASE"
        accountLabel="المورد / الجهة"
        colorTheme="orange"
        prefix="EXP"
    />
);

export const PurchaseReturn = () => (
    <GenericDocument
        title="مرتجع مشتريات (Purchase Return)"
        documentName="إشعار المرتجع"
        type="PURCHASE"
        accountLabel="المورد"
        colorTheme="red"
        prefix="PR"
    />
);
