/**
 * Lightweight toast service.
 * No external dependencies — renders directly to DOM.
 * RTL-friendly, animated, auto-dismiss.
 *
 * Usage:
 *   import { toast } from '../services/toast';
 *   toast.success('تم الحفظ');
 *   toast.error('خطأ في الحفظ');
 */

type ToastType = 'success' | 'error' | 'info';

const COLORS: Record<ToastType, string> = {
    success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    info: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
};

let container: HTMLDivElement | null = null;

function ensureContainer(): HTMLDivElement {
    if (container && document.body.contains(container)) return container;
    container = document.createElement('div');
    container.id = 'wafi-toast-container';
    Object.assign(container.style, {
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: '99999',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        pointerEvents: 'none',
    });
    document.body.appendChild(container);
    return container;
}

function show(message: string, type: ToastType, durationMs = 3000) {
    const root = ensureContainer();
    const el = document.createElement('div');
    Object.assign(el.style, {
        background: COLORS[type],
        color: '#fff',
        padding: '10px 24px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '600',
        fontFamily: 'inherit',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        opacity: '0',
        transform: 'translateY(-12px) scale(0.96)',
        transition: 'all 0.25s ease',
        pointerEvents: 'auto',
        direction: 'rtl',
        maxWidth: '420px',
        textAlign: 'center',
    });
    el.textContent = message;
    root.appendChild(el);

    // Animate in
    requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0) scale(1)';
    });

    // Animate out + remove
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(-8px) scale(0.96)';
        setTimeout(() => el.remove(), 300);
    }, durationMs);

    // Also log for debugging
    if (type === 'error') console.error('[TOAST]', message);
    else console.log('[TOAST]', message);
}

export const toast = {
    success: (msg: string, duration?: number) => show(msg, 'success', duration),
    error: (msg: string, duration?: number) => show(msg, 'error', duration),
    info: (msg: string, duration?: number) => show(msg, 'info', duration),
};

// Convenience aliases (Bisan-Pro pattern)
export const toastSuccess = toast.success;
export const toastError = toast.error;
export const toastInfo = toast.info;
