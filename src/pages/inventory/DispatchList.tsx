import React from 'react';
import DocumentListPage from '../shared/DocumentListPage';
import { DispatchDefinition } from './DispatchDefinition';

export default function DispatchList() {
    return <DocumentListPage definition={DispatchDefinition} />;
}