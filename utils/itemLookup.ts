export interface ItemLike {
    id: string;
    code?: string;
    barcode?: string;
    name_ar?: string;
    name_en?: string;
    name?: string;
    description?: string;
}

const toLatinDigits = (value: string): string =>
    value.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));

const normalize = (value: unknown): string => toLatinDigits(String(value ?? '')).trim().toLowerCase();

const getPrimaryName = (item: ItemLike): string => item.name_ar || item.name || item.name_en || '';

const getNames = (item: ItemLike): string[] =>
    [item.name_ar, item.name, item.name_en]
        .map((name) => normalize(name))
        .filter(Boolean);

const sortByCodeThenName = <T extends ItemLike>(a: T, b: T): number => {
    const codeCmp = normalize(a.code).localeCompare(normalize(b.code));
    if (codeCmp !== 0) return codeCmp;
    return getPrimaryName(a).localeCompare(getPrimaryName(b), 'ar');
};

type Ranked<T extends ItemLike> = {
    item: T;
    rank: number;
};

export const searchItemsByInput = <T extends ItemLike>(items: T[], rawInput: string, maxResults = 20): T[] => {
    const query = normalize(rawInput);
    if (!query) return [];

    const ranked: Ranked<T>[] = items
        .map((item) => {
            const code = normalize(item.code);
            const barcode = normalize(item.barcode);
            const names = getNames(item);

            if (code && code === query) return { item, rank: 0 };
            if (barcode && barcode === query) return { item, rank: 1 };
            if (names.includes(query)) return { item, rank: 2 };

            if (code && code.startsWith(query)) return { item, rank: 3 };
            if (barcode && barcode.startsWith(query)) return { item, rank: 4 };
            if (names.some((name) => name.startsWith(query))) return { item, rank: 5 };

            if (code && code.includes(query)) return { item, rank: 6 };
            if (barcode && barcode.includes(query)) return { item, rank: 7 };
            if (names.some((name) => name.includes(query))) return { item, rank: 8 };

            return null;
        })
        .filter((entry): entry is Ranked<T> => !!entry);

    ranked.sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        return sortByCodeThenName(a.item, b.item);
    });

    return ranked.slice(0, maxResults).map((entry) => entry.item);
};

export const findItemByCode = <T extends ItemLike>(items: T[], rawCode: string): T | null => {
    const query = normalize(rawCode);
    if (!query) return null;

    const exactCode = items.find((item) => normalize(item.code) === query);
    if (exactCode) return exactCode;

    const exactBarcode = items.find((item) => normalize(item.barcode) === query);
    if (exactBarcode) return exactBarcode;

    const exactNameMatches = items.filter((item) => getNames(item).includes(query));
    if (exactNameMatches.length === 1) return exactNameMatches[0];
    if (exactNameMatches.length > 1) return null;

    const prefixMatches = items.filter(
        (item) =>
            normalize(item.code).startsWith(query) ||
            normalize(item.barcode).startsWith(query)
    );
    if (prefixMatches.length === 1) return prefixMatches[0];

    return null;
};
