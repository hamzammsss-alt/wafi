/**
 * Arabic Number to Words (Tafqeet) Utility
 * Converts numeric amounts into professional Arabic text.
 */

export function toArabicWords(amount: number, currencyCode: string = 'ILS'): string {
    if (amount === 0) return 'صفر';

    const currencies: any = {
        'ILS': { single: 'شيكل', plural: 'شواكل', fraction: 'أغورة', fractions: 'أغورات' },
        'USD': { single: 'دولار', plural: 'دولارات', fraction: 'سنت', fractions: 'سنتات' },
        'JOD': { single: 'دينار', plural: 'دنانير', fraction: 'فلش', fractions: 'فلوس' },
        'EUR': { single: 'يورو', plural: 'يورو', fraction: 'سنت', fractions: 'سنتات' }
    };

    const curr = currencies[currencyCode] || currencies['ILS'];

    const parts = amount.toFixed(2).split('.');
    const integerPart = parseInt(parts[0]);
    const fractionPart = parseInt(parts[1]);

    let words = translateNumber(integerPart);

    if (integerPart > 0) {
        words += ' ' + (integerPart >= 3 && integerPart <= 10 ? curr.plural : curr.single);
    }

    if (fractionPart > 0) {
        if (integerPart > 0) words += ' و ';
        words += translateNumber(fractionPart) + ' ' + (fractionPart >= 3 && fractionPart <= 10 ? curr.fractions : curr.fraction);
    }

    return 'فقط ' + words + ' لا غير';
}

function translateNumber(n: number): string {
    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
    const thousands = ['', 'ألف', 'ألفان', 'آلاف', 'ألفا'];

    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' و ' + ones[n % 10] : '');
    if (n < 1000) return hundreds[Math.floor(n / 100)] + (n % 100 !== 0 ? ' و ' + translateNumber(n % 100) : '');

    if (n < 2000) return 'ألف' + (n % 1000 !== 0 ? ' و ' + translateNumber(n % 1000) : '');
    if (n < 3000) return 'ألفان' + (n % 1000 !== 0 ? ' و ' + translateNumber(n % 1000) : '');
    if (n < 10000) return translateNumber(Math.floor(n / 1000)) + ' آلاف' + (n % 1000 !== 0 ? ' و ' + translateNumber(n % 1000) : '');

    return translateNumber(Math.floor(n / 1000)) + ' ألف' + (n % 1000 !== 0 ? ' و ' + translateNumber(n % 1000) : '');
}
