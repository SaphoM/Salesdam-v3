/**
 * Build a search text blob for a record, used to populate the _searchText field.
 * This is indexed for full-text search.
 */
const buildSearchText = async (record, fields) => {
  const parts = [];

  if (record.data) {
    for (const field of fields) {
      if (!field.isSearchable) continue;
      const value = record.data.get(field.apiName);
      if (value !== undefined && value !== null) {
        const strVal = String(value).trim();
        if (strVal) parts.push(strVal);
      }
    }
  }

  return parts.join(' ');
};

export { buildSearchText };
