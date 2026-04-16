import React from 'react';
import { DocumentDefinition } from '../../types/DocumentDefinition';
import ItemMaster from '../../../pages/inventory/ItemMaster';
import { UnitsPage } from '../../../pages/definitions/inventory/UnitsPage';
import { CategoriesPage } from '../../../pages/definitions/inventory/CategoriesPage';
import { BrandsPage } from '../../../pages/definitions/inventory/BrandsPage';
import { WarehousesPage } from '../../../pages/definitions/inventory/WarehousesPage';
import { PartnerForm } from '../../../pages/definitions/partners/PartnerForm';
import { SalesRepsPage } from '../../../pages/definitions/partners/SalesRepsPage';
import { VehiclesPage } from '../../../pages/definitions/logistics/VehiclesPage';
import { CurrencyList } from '../../../pages/definitions/finance/CurrencyList';
import { CostCenterList } from '../../../pages/definitions/finance/CostCenterList';
import { TaxList } from '../../../pages/definitions/finance/TaxList';
import { PriceListsPage } from '../../../pages/definitions/PriceListsPage';
import { PaymentMethods } from '../../../pages/definitions/financial/PaymentMethods';
import { BanksPage } from '../../../pages/definitions/financial/BanksPage';
import { OurAccountsPage } from '../../../pages/banking/OurAccountsPage';
import { ChartOfAccounts } from '../../../pages/accounting/master/ChartOfAccounts';
import { FinancialDefinitions } from '../../../pages/accounting/master/FinancialDefinitions';
import { ChequePortfolio } from '../../../pages/treasury/cheques/ChequePortfolio';
import { Branches } from '../../../pages/settings/Branches';
import { DocumentSupportSection } from './DocumentSupportDock';

type DocumentShape = Pick<DocumentDefinition<any, any>, 'docType' | 'headerFields' | 'headerSchema' | 'lineColumns' | 'linesSchema' | 'lineLookup'>;

function uniqueSections(sections: DocumentSupportSection[]): DocumentSupportSection[] {
    const seen = new Set<string>();
    return sections.filter((section) => {
        if (!section?.id || seen.has(section.id)) return false;
        seen.add(section.id);
        return true;
    });
}

const sectionFactory = {
    items: (): DocumentSupportSection => ({
        id: 'items',
        label: 'الأصناف',
        description: 'تعريف بطاقة الصنف، الأسعار، والوحدات المرتبطة به.',
        group: 'definitions',
        render: () => <ItemMaster />,
    }),
    units: (): DocumentSupportSection => ({
        id: 'units',
        label: 'الوحدات',
        description: 'إدارة وحدات القياس المستخدمة داخل السندات.',
        group: 'definitions',
        render: () => <UnitsPage />,
    }),
    categories: (): DocumentSupportSection => ({
        id: 'item-categories',
        label: 'مجموعات الأصناف',
        description: 'تصنيف الأصناف ضمن عائلات ومجموعات.',
        group: 'definitions',
        render: () => <CategoriesPage />,
    }),
    brands: (): DocumentSupportSection => ({
        id: 'brands',
        label: 'الماركات',
        description: 'تعريف العلامات التجارية وربطها بالأصناف.',
        group: 'definitions',
        render: () => <BrandsPage />,
    }),
    warehouses: (): DocumentSupportSection => ({
        id: 'warehouses',
        label: 'المستودعات',
        description: 'تعريف المستودعات ومتابعة إعداداتها.',
        group: 'definitions',
        render: () => <WarehousesPage />,
    }),
    partners: (): DocumentSupportSection => ({
        id: 'partners',
        label: 'العملاء والموردون',
        description: 'إدارة البطاقات الموحدة للعملاء والموردين والموظفين.',
        group: 'definitions',
        render: () => <PartnerForm />,
    }),
    salesReps: (): DocumentSupportSection => ({
        id: 'sales-reps',
        label: 'مندوبو المبيعات',
        description: 'تعريف المندوبين وربطهم بالسندات والحركات.',
        group: 'definitions',
        render: () => <SalesRepsPage />,
    }),
    priceLists: (): DocumentSupportSection => ({
        id: 'price-lists',
        label: '\u0642\u0648\u0627\u0626\u0645 \u0627\u0644\u0623\u0633\u0639\u0627\u0631',
        description: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0642\u0648\u0627\u0626\u0645 \u0627\u0644\u0633\u0639\u0631\u064a\u0629 \u0648\u062a\u0633\u0639\u064a\u0631 \u0627\u0644\u0623\u0635\u0646\u0627\u0641 \u062f\u0627\u062e\u0644 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629.',
        group: 'definitions',
        render: () => <PriceListsPage />,
    }),
    paymentMethods: (): DocumentSupportSection => ({
        id: 'payment-methods',
        label: '\u0637\u0631\u0642 \u0627\u0644\u062f\u0641\u0639',
        description: '\u062a\u0639\u0631\u064a\u0641 \u0648\u0633\u0627\u0626\u0644 \u0627\u0644\u062f\u0641\u0639 \u0648\u0631\u0628\u0637\u0647\u0627 \u0628\u0627\u0644\u0633\u0646\u062f \u0648\u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a.',
        group: 'definitions',
        render: () => <PaymentMethods />,
    }),
    branches: (): DocumentSupportSection => ({
        id: 'branches',
        label: '\u0627\u0644\u0641\u0631\u0648\u0639',
        description: '\u0625\u062f\u0627\u0631\u0629 \u0641\u0631\u0648\u0639 \u0627\u0644\u0634\u0631\u0643\u0629 \u0648\u062a\u062d\u062f\u064a\u062f \u0627\u0644\u0641\u0631\u0639 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u062f\u0627\u062e\u0644 \u0627\u0644\u0633\u0646\u062f.',
        group: 'definitions',
        render: () => <Branches />,
    }),
    vehicles: (): DocumentSupportSection => ({
        id: 'vehicles',
        label: 'المركبات',
        description: 'تعريف المركبات والشاحنات المستخدمة في الإرسال والاستلام.',
        group: 'definitions',
        render: () => <VehiclesPage />,
    }),
    currencies: (): DocumentSupportSection => ({
        id: 'currencies',
        label: 'العملات',
        description: 'إدارة العملات وأسعار الصرف المستخدمة داخل السند.',
        group: 'definitions',
        render: () => <CurrencyList />,
    }),
    costCenters: (): DocumentSupportSection => ({
        id: 'cost-centers',
        label: 'مراكز التكلفة',
        description: 'تعريف مراكز التكلفة وربطها بالقيود والحركات.',
        group: 'definitions',
        render: () => <CostCenterList />,
    }),
    taxes: (): DocumentSupportSection => ({
        id: 'taxes',
        label: 'الضرائب',
        description: 'إدارة نسب الضرائب والتجميعات الضريبية.',
        group: 'definitions',
        render: () => <TaxList />,
    }),
    banks: (): DocumentSupportSection => ({
        id: 'banks',
        label: 'البنوك',
        description: 'تعريف البنوك والفروع والحسابات البنكية الأساسية.',
        group: 'definitions',
        render: () => <BanksPage />,
    }),
    bankAccounts: (): DocumentSupportSection => ({
        id: 'bank-accounts',
        label: 'حساباتنا البنكية',
        description: 'إدارة الحسابات البنكية الداخلية وربطها بالحسابات العامة.',
        group: 'definitions',
        render: () => <OurAccountsPage />,
    }),
    financialDefinitions: (): DocumentSupportSection => ({
        id: 'financial-definitions',
        label: 'التعريفات المالية',
        description: 'تعريف الإعدادات المالية العامة المستخدمة في القيود والسندات.',
        group: 'definitions',
        render: () => <FinancialDefinitions />,
    }),
    chartOfAccounts: (): DocumentSupportSection => ({
        id: 'chart-of-accounts',
        label: 'دليل الحسابات',
        description: 'إدارة الحسابات العامة واختيار الحسابات التشغيلية.',
        group: 'definitions',
        render: () => <ChartOfAccounts />,
    }),
    chequePortfolio: (): DocumentSupportSection => ({
        id: 'cheque-portfolio',
        label: 'محفظة الشيكات',
        description: 'متابعة الشيكات القابلة للإيداع أو التحصيل.',
        group: 'lists',
        render: () => <ChequePortfolio />,
    }),
};

function inventoryCatalogSections(): DocumentSupportSection[] {
    return [
        sectionFactory.items(),
        sectionFactory.units(),
        sectionFactory.categories(),
        sectionFactory.brands(),
        sectionFactory.warehouses(),
    ];
}

export function getInventoryOperationSupportSections(): DocumentSupportSection[] {
    return uniqueSections([
        ...inventoryCatalogSections(),
        sectionFactory.partners(),
        sectionFactory.salesReps(),
        sectionFactory.vehicles(),
    ]);
}

export function getTreasurySupportSections(): DocumentSupportSection[] {
    return uniqueSections([
        sectionFactory.partners(),
        sectionFactory.costCenters(),
        sectionFactory.banks(),
        sectionFactory.bankAccounts(),
        sectionFactory.currencies(),
        sectionFactory.financialDefinitions(),
        sectionFactory.chartOfAccounts(),
    ]);
}

export function getImportSupportSections(): DocumentSupportSection[] {
    return uniqueSections([
        ...inventoryCatalogSections(),
        sectionFactory.partners(),
        sectionFactory.currencies(),
        sectionFactory.warehouses(),
    ]);
}

export function getItemMasterSupportSections(): DocumentSupportSection[] {
    return uniqueSections([
        sectionFactory.units(),
        sectionFactory.categories(),
        sectionFactory.brands(),
        sectionFactory.warehouses(),
    ]);
}

export function getBankDepositSupportSections(): DocumentSupportSection[] {
    return uniqueSections([
        sectionFactory.chequePortfolio(),
        sectionFactory.bankAccounts(),
        sectionFactory.banks(),
        sectionFactory.currencies(),
        sectionFactory.financialDefinitions(),
    ]);
}

export function buildDocumentSupportSections(definition: DocumentShape): DocumentSupportSection[] {
    const headerFields = definition.headerSchema || definition.headerFields || [];
    const lineSchema = definition.linesSchema || definition.lineColumns || [];
    const keys = new Set<string>([
        ...headerFields.map((field) => String(field.key || '')),
        ...lineSchema.map((column) => String(column.key || '')),
    ]);
    const docType = String(definition.docType || '').toLowerCase();

    const hasItems = Array.from(keys).some((key) => key.includes('item'));
    const hasWarehouse =
        keys.has('warehouse_id')
        || keys.has('from_warehouse_id')
        || keys.has('to_warehouse_id');
    const hasCustomer = keys.has('customer_id') || docType.startsWith('sales');
    const hasSupplier = keys.has('supplier_id') || docType.startsWith('purchase');
    const hasBranches = keys.has('branch_id');
    const hasCurrency = keys.has('currency_id');
    const hasPriceLists = keys.has('price_list_id') || docType.startsWith('sales');
    const hasPaymentMethods = keys.has('payment_method_id') || docType.includes('invoice');
    const hasTaxes = keys.has('tax_group_id') || keys.has('tax_rate') || docType.includes('invoice') || docType.includes('order');
    const hasCostCenters = keys.has('cost_center_id') || docType.includes('journal');
    const hasAccounts =
        keys.has('account_id')
        || keys.has('account_code_lookup')
        || definition.lineLookup?.type === 'account'
        || docType.includes('journal');

    const sections: DocumentSupportSection[] = [];

    if (hasItems) sections.push(...inventoryCatalogSections());
    if (hasWarehouse) sections.push(sectionFactory.warehouses());
    if (hasCustomer || hasSupplier) sections.push(sectionFactory.partners());
    if (docType.startsWith('sales') || hasCustomer) sections.push(sectionFactory.salesReps());
    if (hasBranches) sections.push(sectionFactory.branches());
    if (hasCurrency) sections.push(sectionFactory.currencies());
    if (hasPriceLists) sections.push(sectionFactory.priceLists());
    if (hasPaymentMethods) sections.push(sectionFactory.paymentMethods());
    if (hasTaxes) sections.push(sectionFactory.taxes());
    if (hasCostCenters) sections.push(sectionFactory.costCenters());
    if (hasAccounts) {
        sections.push(sectionFactory.financialDefinitions());
        sections.push(sectionFactory.chartOfAccounts());
    }

    return uniqueSections(sections);
}
