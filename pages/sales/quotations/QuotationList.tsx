import React from 'react';
import DocumentListPage from '../../../src/pages/shared/DocumentListPage';
import { QuotationDefinition } from './QuotationDefinition';

export function QuotationList() {
    return <DocumentListPage definition={QuotationDefinition} />;
}
