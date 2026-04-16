import React from 'react';
import DocumentListPage from '../../../src/pages/shared/DocumentListPage';
import { RFQDefinition } from './RFQDefinition';

export default function RFQList() {
    return <DocumentListPage definition={RFQDefinition} />;
}
