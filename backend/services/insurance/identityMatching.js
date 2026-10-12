/**
 * Insurance client identity matching (BRD §7.5).
 *
 * One Person Client master: before creating a Client for a premium payer,
 * main member, spouse, child, extended-family member, beneficiary, claimant or
 * payee, match against existing Clients — exact ID number first, then passport,
 * email, mobile. Matching is ALWAYS tenant-scoped; records are never compared
 * across tenants.
 */
import { findOne, createDynamic } from './dynamicRecords.js';
import { AppError } from '../../utils/errors.js';

/** Priority order per BRD §7.5 (configurable combinations come later). */
export const MATCH_PRIORITY = ['id_number', 'passport_number', 'email', 'phone'];

/** Return the first existing tenant-scoped Client matching the supplied keys. */
export const findClientByKeys = async (tenantId, input = {}) => {
  for (const field of MATCH_PRIORITY) {
    const value = input[field];
    if (value === undefined || value === null || value === '') continue;
    const record = await findOne(tenantId, 'client', { [`data.${field}`]: value });
    if (record) return { record, matchedOn: field };
  }
  return null;
};

const displayName = (input) =>
  input.name ||
  [input.first_name, input.last_name].filter(Boolean).join(' ').trim() ||
  input.email ||
  input.phone ||
  'Unnamed Client';

/**
 * Resolve an input to a single Client: reuse an explicit client_id, reuse an
 * existing match, else create a new Person Client.
 *
 * @returns {{record, created:boolean, matchedOn:string}}
 */
export const resolveClient = async ({ tenantId, userId, input = {} }) => {
  if (input.client_id) {
    const record = await findOne(tenantId, 'client', { _id: input.client_id });
    if (!record) throw new AppError('Referenced client was not found.', 404);
    return { record, created: false, matchedOn: 'client_id' };
  }

  const match = await findClientByKeys(tenantId, input);
  if (match) return { record: match.record, created: false, matchedOn: match.matchedOn };

  const record = await createDynamic({
    tenantId,
    objectApiName: 'client',
    userId,
    data: {
      name: displayName(input),
      type: input.type || 'person',
      email: input.email,
      phone: input.phone,
      id_number: input.id_number,
      passport_number: input.passport_number,
      ...(input.extra || {}),
    },
  });
  return { record, created: true, matchedOn: 'created' };
};

export default { findClientByKeys, resolveClient, MATCH_PRIORITY };
