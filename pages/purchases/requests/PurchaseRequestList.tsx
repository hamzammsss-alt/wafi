import React from 'react';
import DocumentListPage from '../../../src/pages/shared/DocumentListPage';
import { PurchaseRequestDefinition } from './PurchaseRequestDefinition';

export function PurchaseRequestList() {
    return <DocumentListPage definition={PurchaseRequestDefinition} />;
}
