import React from 'react';
import { GenericDocument } from '../../components/GenericDocument';

// This file consolidates the purchasing cycle documents for cleaner import/export

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
