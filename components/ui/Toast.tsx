import React from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useNotifications, Notification, NotificationType } from '../../src/contexts/NotificationsContext';

const icons = {
    success: <CheckCircle size={20} className="text-emerald-500" />,
    error: <AlertCircle size={20} className="text-red-500" />,
    warning: <AlertTriangle size={20} className="text-amber-500" />,
    info: <Info size={20} className="text-blue-500" />,
};

const styles = {
    success: 'bg-white/95 border border-emerald-200 shadow-lg shadow-emerald-500/15',
    error: 'bg-white/95 border border-red-200 shadow-lg shadow-red-500/15',
    warning: 'bg-white/95 border border-amber-200 shadow-lg shadow-amber-500/15',
    info: 'bg-white/95 border border-blue-200 shadow-lg shadow-blue-500/15',
};

export const ToastContainer: React.FC = () => {
    const { notifications, removeNotification } = useNotifications();

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none p-4">
            {notifications.map((notification) => (
                <ToastItem key={notification.id} notification={notification} onClose={() => removeNotification(notification.id)} />
            ))}
        </div>
    );
};

const ToastItem: React.FC<{ notification: Notification; onClose: () => void }> = ({ notification, onClose }) => {
    return (
        <div
            className={`
                pointer-events-auto
                flex items-start gap-3 rounded-xl p-4
                transform transition-all duration-300 ease-in-out
                animate-in slide-in-from-top-2 fade-in zoom-in-95
                ${styles[notification.type]}
            `}
            role="alert"
        >
            <div className="shrink-0 mt-0.5">{icons[notification.type]}</div>
            <div className="flex-1 pt-0.5">
                <p className="text-sm font-medium text-slate-800 leading-snug">
                    {notification.message}
                </p>
            </div>
            <button
                onClick={onClose}
                className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-md hover:bg-slate-100"
            >
                <X size={16} />
            </button>
        </div>
    );
};
