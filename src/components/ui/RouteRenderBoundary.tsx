import React from 'react';

type RouteRenderBoundaryProps = {
    routePath: string;
    children: React.ReactNode;
};

type RouteRenderBoundaryState = {
    error: Error | null;
};

export class RouteRenderBoundary extends React.Component<RouteRenderBoundaryProps, RouteRenderBoundaryState> {
    state: RouteRenderBoundaryState = {
        error: null,
    };

    static getDerivedStateFromError(error: Error): RouteRenderBoundaryState {
        return { error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error(`[RouteRenderBoundary] ${this.props.routePath}`, error, errorInfo);
    }

    componentDidUpdate(prevProps: RouteRenderBoundaryProps) {
        if (prevProps.routePath !== this.props.routePath && this.state.error) {
            this.setState({ error: null });
        }
    }

    render() {
        if (!this.state.error) {
            return this.props.children;
        }

        return (
            <div className="flex h-full min-h-[420px] items-center justify-center bg-slate-50 p-6" dir="rtl">
                <div className="w-full max-w-2xl rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
                    <div className="text-sm font-bold uppercase tracking-[0.16em] text-rose-500">Runtime Error</div>
                    <h2 className="mt-3 text-2xl font-extrabold text-slate-900">تعذر فتح هذه الشاشة</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                        تم احتواء الخطأ داخل هذه الصفحة حتى لا تتحول النافذة بالكامل إلى شاشة بيضاء.
                    </p>
                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                        <div className="font-bold text-slate-900">المسار</div>
                        <div className="mt-1 break-all font-mono text-xs">{this.props.routePath}</div>
                    </div>
                    <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800">
                        <div className="font-bold">الرسالة</div>
                        <div className="mt-1 break-words">{this.state.error.message || 'Unknown runtime error'}</div>
                    </div>
                </div>
            </div>
        );
    }
}
