export const formatRands = (n) => {
  if (n == null) return '—';
  if (n >= 1_000_000) return `R${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `R${(n / 1_000).toFixed(0)}K`;
  return `R${Number(n).toLocaleString('en-ZA')}`;
};
