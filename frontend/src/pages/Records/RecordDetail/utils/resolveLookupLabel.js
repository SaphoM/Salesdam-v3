import api from '../../../services/api';

/** Resolve a lookup ObjectId to a display label. Handles 'user' and CRM objects. */
const resolveLookupLabel = async (field, value) => {
  if (!value) return null;
  try {
    if (field.lookupObjectApiName === 'user') {
      const res = await api.get(`/users/${value}/public-profile`);
      const u = res.data.data;
      return { label: `${u.firstName} ${u.lastName}`, link: null };
    } else if (field.lookupObjectApiName) {
      const res = await api.get(
        `/records/${field.lookupObjectApiName}/${value}`,
      );
      const rec = res.data.data;
      const displayKey = field.lookupDisplayField || 'name';
      const label =
        rec[displayKey] ||
        (rec.first_name
          ? `${rec.first_name || ''} ${rec.last_name || ''}`.trim()
          : null) ||
        String(value).slice(-8);
      return { label, link: `/o/${field.lookupObjectApiName}/${value}` };
    }
  } catch {
    return { label: String(value).slice(-8), link: null };
  }
  return null;
};

export default resolveLookupLabel;
