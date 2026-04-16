import React from 'react';
import DocumentListPage from '../../../src/pages/shared/DocumentListPage';
import { PurchaseOrderDefinition } from './PurchaseOrderDefinition';

export function PurchaseOrderList() {
    return <DocumentListPage definition={PurchaseOrderDefinition} />;
}
