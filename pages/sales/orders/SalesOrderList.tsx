import React from 'react';
import DocumentListPage from '../../../src/pages/shared/DocumentListPage';
import { SalesOrderDefinition } from './SalesOrderDefinition';

export function SalesOrderList() {
    return <DocumentListPage definition={SalesOrderDefinition} />;
}
