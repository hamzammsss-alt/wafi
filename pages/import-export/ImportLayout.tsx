import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Package, FileText, Anchor, Settings, BarChart, Truck, Folder } from 'lucide-react';

export const ImportLayout: React.FC = () => {
    const location = useLocation();

    const menuItems = [
        { path: '/import', label: 'Dashboard', icon: <BarChart size={18} /> },
        { path: '/import/proformas', label: 'Proforma Invoices', icon: <FileText size={18} /> },
        { path: '/import/shipments', label: 'Import Shipments', icon: <Anchor size={18} /> },
        { path: '/import/containers', label: 'Container Tracking', icon: <Package size={18} /> },
        { path: '/import/export', label: 'Export Documents', icon: <Truck size={18} /> },
        { path: '/import/active-files', label: 'Active Files', icon: <Folder size={18} /> },
    ];

    return (
        <div className="flex h-full bg-gray-50 direction-rtl">
            {/* Sidebar */}
            <div className="w-64 bg-white border-l border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-100 bg-blue-50">
                    <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                        <Anchor className="text-blue-600" />
                        Import & Export
                    </h2>
                    <p className="text-xs text-blue-500 mt-1">WAFI Import Module</p>
                </div>

                <nav className="flex-1 overflow-y-auto py-4">
                    <ul className="space-y-1 px-2">
                        {menuItems.map((item) => {
                            const isActive = location.pathname === item.path || (item.path !== '/import' && location.pathname.startsWith(item.path));
                            return (
                                <li key={item.path}>
                                    <Link
                                        to={item.path}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                                ? 'bg-blue-50 text-blue-700'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            }`}
                                    >
                                        {item.icon}
                                        {item.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
