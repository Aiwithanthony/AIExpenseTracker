/**
 * Shared currency catalog — used by the post-signup profile step and the
 * Settings currency picker. Middle-East currencies first (primary audience),
 * then major internationals.
 */
export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'LBP', name: 'Lebanese Pound', symbol: 'L\u00A3' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E\u00A3' },
  { code: 'JOD', name: 'Jordanian Dinar', symbol: 'JD' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BD' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QR' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'OMR' },
  { code: 'IQD', name: 'Iraqi Dinar', symbol: 'IQD' },
  { code: 'TND', name: 'Tunisian Dinar', symbol: 'TND' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'MAD' },
  { code: 'DZD', name: 'Algerian Dinar', symbol: 'DZD' },
  { code: 'LYD', name: 'Libyan Dinar', symbol: 'LYD' },
  { code: 'SYP', name: 'Syrian Pound', symbol: 'SYP' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '\u20BA' },
  { code: 'EUR', name: 'Euro', symbol: '\u20AC' },
  { code: 'GBP', name: 'British Pound', symbol: '\u00A3' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '\u00A5' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'INR', name: 'Indian Rupee', symbol: '\u20B9' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '\u00A5' },
  { code: 'KRW', name: 'South Korean Won', symbol: '\u20A9' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '\u20A6' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH\u20B5' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'z\u0142' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'COP', name: 'Colombian Peso', symbol: 'COL$' },
  { code: 'ARS', name: 'Argentine Peso', symbol: 'AR$' },
  { code: 'CLP', name: 'Chilean Peso', symbol: 'CL$' },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/' },
  { code: 'THB', name: 'Thai Baht', symbol: '\u0E3F' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '\u20B1' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '\u20AB' },
];
