import { AppEdition } from '../lib/edition';

export interface VerticalAppDefinition {
    id: string;
    name: string;
    description: string;
    targetPath: string;
    editions: AppEdition[];
}

export const VERTICAL_APPS: VerticalAppDefinition[] = [
    {
        id: 'retail_pos',
        name: 'Retail POS',
        description: 'High-volume point-of-sale workflow with invoice and cash cycle.',
        targetPath: '/trade/sales/pos',
        editions: ['STANDARD'],
    },
    {
        id: 'distribution',
        name: 'Distribution',
        description: 'Route planning, delivery execution, and rep settlement cycle.',
        targetPath: '/trade/distribution/routes',
        editions: ['STANDARD', 'NGO', 'GOVERNMENT'],
    },
    {
        id: 'manufacturing',
        name: 'Manufacturing',
        description: 'BOM, production orders, and material execution lifecycle.',
        targetPath: '/manufacturing/orders',
        editions: ['STANDARD'],
    },
    {
        id: 'import_export',
        name: 'Import & Export',
        description: 'Shipment files, landed cost allocation, and customs-facing operations.',
        targetPath: '/import/dashboard',
        editions: ['STANDARD', 'NGO', 'GOVERNMENT'],
    },
    {
        id: 'ngo_programs',
        name: 'NGO Programs',
        description: 'Grant budget control, donor reporting cadence, and project tracking.',
        targetPath: '/editions/ngo',
        editions: ['NGO'],
    },
    {
        id: 'gov_procurement',
        name: 'Government Procurement',
        description: 'Tender-driven purchasing, approval traceability, and commitment checks.',
        targetPath: '/editions/government',
        editions: ['GOVERNMENT'],
    },
];
