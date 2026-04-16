export type ActiveGridApi = {
    /** هل يوجد صف/خلية نشطة؟ */
    hasActiveCell: () => boolean;

    /** Delete: حسب القاعدة (داخل input = مسح، خارج = حذف سطر) */
    deleteSmart: () => void;

    /** Ctrl+Delete: حذف السطر دائماً */
    deleteRowForce: () => void;

    /** F2: افتح Lookup للسطر/الخلية الحالية */
    requestLookup: () => void;

    /** إرجاع الفوكس بعد حذف/مودال */
    restoreFocus?: () => void;
};

let current: ActiveGridApi | null = null;

export const ActiveGridRegistry = {
    set(api: ActiveGridApi | null) {
        current = api;
    },
    get() {
        return current;
    },
    clear() {
        current = null;
    }
};
