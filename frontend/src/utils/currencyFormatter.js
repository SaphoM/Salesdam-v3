/**
 * Format a number as currency using the org's operating currency
 * @param {number} amount - The amount to format
 * @param {object} currency - Currency object with code, name, symbol
 * @param {object} options - Formatting options
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = {}, options = {}) => {
  const {
    code = 'ZAR',
    symbol = 'R',
  } = currency;

  const {
    decimals = 2,
    prefix = true,
    showCode = false,
  } = options;

  if (amount === null || amount === undefined) {
    return `${symbol}0.00`;
  }

  const num = parseFloat(amount);
  if (isNaN(num)) {
    return `${symbol}0.00`;
  }

  const formatted = num.toLocaleString('en-ZA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (prefix) {
    return showCode ? `${symbol} (${code}) ${formatted}` : `${symbol}${formatted}`;
  }
  return formatted;
};

/**
 * Format currency range (from - to)
 * @param {number} from - Start amount
 * @param {number} to - End amount
 * @param {object} currency - Currency object
 * @param {object} options - Formatting options
 * @returns {string} Formatted range
 */
export const formatCurrencyRange = (from, to, currency = {}, options = {}) => {
  const fromFormatted = formatCurrency(from, currency, { ...options, prefix: false });
  const toFormatted = formatCurrency(to, currency, options);
  return `${currency.symbol || 'R'}${fromFormatted} - ${toFormatted}`;
};

/**
 * Parse formatted currency back to number
 * @param {string} formattedValue - Formatted currency string
 * @returns {number} Parsed amount
 */
export const parseCurrency = (formattedValue) => {
  if (!formattedValue) return 0;

  // Remove currency symbols and non-numeric characters (except decimal point and minus)
  const cleaned = formattedValue
    .replace(/[^\d.\-]/g, '')
    .trim();

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Get currency display string
 * @param {object} currency - Currency object
 * @returns {string} Display string like "R (ZAR)"
 */
export const getCurrencyDisplay = (currency = {}) => {
  const { symbol = 'R', code = 'ZAR' } = currency;
  return `${symbol} (${code})`;
};

/**
 * Compare two amounts with currency consideration
 * @param {number} amount1 - First amount
 * @param {number} amount2 - Second amount
 * @returns {number} -1 if amount1 < amount2, 0 if equal, 1 if greater
 */
export const compareCurrencyAmounts = (amount1, amount2) => {
  const num1 = parseFloat(amount1) || 0;
  const num2 = parseFloat(amount2) || 0;

  if (num1 < num2) return -1;
  if (num1 > num2) return 1;
  return 0;
};
