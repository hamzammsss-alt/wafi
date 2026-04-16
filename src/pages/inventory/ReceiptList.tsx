import React from 'react';
import DocumentListPage from '../shared/DocumentListPage';
import { ReceiptDefinition } from './ReceiptDefinition';

export default function ReceiptList() {
    return <DocumentListPage definition={ReceiptDefinition} />;
}