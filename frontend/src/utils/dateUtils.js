export const getTimeOfDay = () => {
  const h = new Date().getHours();

  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';

  return 'evening';
};

export const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-ZA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return d;
  }
};

/**
 * Formats a date-only string, e.g. "26 Aug 2026".
 * Returns null for missing/invalid input so callers (e.g. <Row />) can hide the field.
 */
export const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;

  return date.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Formats a date + time string, e.g. "26 Aug 2026, 11:00".
 * Returns null for missing/invalid input so callers (e.g. <Row />) can hide the field.
 */
export const formatDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;

  const datePart = date.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return `${datePart}, ${timePart}`;
};
