import React from 'react';
import { GenericDocument } from '../../components/GenericDocument';

export const StockIn = () => (
    <GenericDocument
        title="سند إدخال مخزني (Stock In)"
        documentName="سند الإدخال"
        type="INVENTORY"
        accountLabel="المستودع"
        colorTheme="emerald"
        prefix="STI"
    />
);

export const StockOut = () => (
    <GenericDocument
        title="سند إخراج مخزني (Stock Out)"
        documentName="سند الإخراج"
        type="INVENTORY"
        accountLabel="المستودع"
        colorTheme="emerald"
        prefix="STO"
    />
);

export const Transfer = () => (
    <GenericDocument
        title="نقل بين المستودعات (Transfer)"
        documentName="سند النقل"
        type="INVENTORY"
        accountLabel="من مستودع"
        colorTheme="blue"
        prefix="TRF"
    />
);
