import { useAuthContext } from '../context/AuthContext';
import { formatCurrency } from '../utils/currencyFormatter';

/**
 * Hook to access the organization's operating currency and formatting utilities
 * @returns {object} { currency, formatCurrency: function, formatValue: shorthand }
 */
export const useCurrency = () => {
  const ctx = useAuthContext();

  const currency = ctx?.tenant?.operatingCurrency || {
    code: 'ZAR',
    name: 'South African Rand',
    symbol: 'R',
  };

  const formatValue = (amount, options = {}) =>
    formatCurrency(amount, currency, options);

  return {
    currency,
    formatCurrency: formatValue,
    symbol: currency.symbol,
    code: currency.code,
  };
};

export default useCurrency;
