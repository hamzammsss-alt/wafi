export interface CurrencyInfo {
  code: string;
  symbol: string;
  name_ar: string;
  name_en: string;
}

export const commonCurrencies: CurrencyInfo[] = [
  { code: 'USD', symbol: '$', name_ar: 'دولار أمريكي', name_en: 'United States Dollar' },
  { code: 'EUR', symbol: '€', name_ar: 'يورو', name_en: 'Euro' },
  { code: 'GBP', symbol: '£', name_ar: 'جنيه إسترليني', name_en: 'British Pound Sterling' },
  { code: 'JPY', symbol: '¥', name_ar: 'ين ياباني', name_en: 'Japanese Yen' },
  { code: 'CHF', symbol: 'Fr', name_ar: 'فرنك سويسري', name_en: 'Swiss Franc' },
  { code: 'CAD', symbol: 'C$', name_ar: 'دولار كندي', name_en: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name_ar: 'دولار أسترالي', name_en: 'Australian Dollar' },
  { code: 'CNY', symbol: '¥', name_ar: 'يوان صيني', name_en: 'Chinese Yuan' },
  { code: 'ILS', symbol: '₪', name_ar: 'شيكل إسرائيلي جديد', name_en: 'Israeli New Shekel' },
  { code: 'JOD', symbol: 'JD', name_ar: 'دينار أردني', name_en: 'Jordanian Dinar' },
  { code: 'EGP', symbol: 'E£', name_ar: 'جنيه مصري', name_en: 'Egyptian Pound' },
  { code: 'SAR', symbol: 'SR', name_ar: 'ريال سعودي', name_en: 'Saudi Riyal' },
  { code: 'AED', symbol: 'د.إ', name_ar: 'درهم إماراتي', name_en: 'United Arab Emirates Dirham' },
  { code: 'QAR', symbol: 'QR', name_ar: 'ريال قطري', name_en: 'Qatari Riyal' },
  { code: 'KWD', symbol: 'KD', name_ar: 'دينار كويتي', name_en: 'Kuwaiti Dinar' },
  { code: 'TRY', symbol: '₺', name_ar: 'ليرة تركية', name_en: 'Turkish Lira' },
];