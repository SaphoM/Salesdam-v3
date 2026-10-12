import Tender from '../models/tender.model.js';

const toDateOrNull = (value) => (value ? new Date(value) : null);

/**
 * Maps a raw eTenders record (mixed snake_case/PascalCase fields) into our
 * camelCase Mongoose shape.
 */
export const mapRawTenderToDoc = (raw) => ({
  sourceId: raw.id,
  tenderNumber: raw.tender_No,
  description: raw.description,
  category: raw.category,
  categoryId: raw.categoriesID,
  type: raw.type,

  organOfState: raw.organ_of_State,
  department: raw.department,
  departmentId: raw.departmentsID,

  status: raw.status,

  province: raw.province,
  provinceId: raw.provincesID,

  datePublished: toDateOrNull(raw.date_Published),
  closingDate: toDateOrNull(raw.closing_Date),

  briefingSession: Boolean(raw.briefingSession),
  briefingCompulsory: Boolean(raw.briefingCompulsory),
  compulsoryBriefingSession: toDateOrNull(raw.compulsory_briefing_session),
  briefingVenue: raw.briefingVenue,

  streetName: raw.streetname,
  suburb: raw.surburb,
  town: raw.town,
  postalCode: raw.code,
  delivery: raw.delivery,

  conditions: raw.conditions,
  contactPerson: raw.contactPerson,
  email: raw.email,
  telephone: raw.telephone,
  fax: raw.fax,

  eSubmission: Boolean(raw.eSubmission),
  twoEnvelopeSubmission: Boolean(raw.twoEnvelopeSubmission),
  validity: raw.validity,

  supportDocuments: (raw.supportDocument || []).map((doc) => ({
    documentId: doc.supportDocumentID,
    fileName: doc.fileName,
    extension: doc.extension,
    dateModified: toDateOrNull(doc.dateModified),
  })),

  raw,
});

/**
 * Upserts a batch of raw tender records. Returns counts for logging.
 */
export const upsertRawTenders = async (rawTenders) => {
  let upserted = 0;
  let failed = 0;

  const operations = rawTenders
    .filter((raw) => raw && raw.id !== undefined && raw.id !== null)
    .map((raw) => {
      const doc = mapRawTenderToDoc(raw);
      return {
        updateOne: {
          filter: { sourceId: doc.sourceId },
          update: { $set: doc },
          upsert: true,
        },
      };
    });

  if (operations.length === 0) {
    return { upserted: 0, failed: 0, total: rawTenders.length };
  }

  try {
    const result = await Tender.bulkWrite(operations, { ordered: false });
    upserted =
      (result.upsertedCount || 0) + (result.modifiedCount || 0) +
      (result.matchedCount ? 0 : 0);
  } catch (err) {
    failed = operations.length;
    throw err;
  }

  return { upserted, failed, total: rawTenders.length };
};

/**
 * Builds a Mongo filter object from query-string style filters.
 */
export const buildFilterQuery = (filters = {}) => {
  const query = {};

  const exactFields = [
    'category',
    'province',
    'department',
    'status',
    'organOfState',
    'tenderNumber',
  ];
  exactFields.forEach((field) => {
    if (filters[field]) {
      query[field] = { $regex: filters[field], $options: 'i' };
    }
  });

  if (filters.eSubmission !== undefined) {
    query.eSubmission = filters.eSubmission === 'true' || filters.eSubmission === true;
  }
  if (filters.briefingCompulsory !== undefined) {
    query.briefingCompulsory =
      filters.briefingCompulsory === 'true' || filters.briefingCompulsory === true;
  }

  if (filters.search) {
    query.$or = [
      { description: { $regex: filters.search, $options: 'i' } },
      { tenderNumber: { $regex: filters.search, $options: 'i' } },
    ];
  }

  const buildRange = (fromKey, toKey) => {
    const range = {};
    if (filters[fromKey]) range.$gte = new Date(filters[fromKey]);
    if (filters[toKey]) range.$lte = new Date(filters[toKey]);
    return Object.keys(range).length ? range : null;
  };

  const datePublishedRange = buildRange('datePublishedFrom', 'datePublishedTo');
  if (datePublishedRange) query.datePublished = datePublishedRange;

  const closingDateRange = buildRange('closingDateFrom', 'closingDateTo');
  if (closingDateRange) query.closingDate = closingDateRange;

  return query;
};

/**
 * Returns a paginated, filtered, sorted list of tenders.
 */
export const queryTenders = async (filters = {}) => {
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const sortByAllowed = new Set([
    'closingDate',
    'datePublished',
    'createdAt',
    'tenderNumber',
    'category',
  ]);
  const sortBy = sortByAllowed.has(filters.sortBy) ? filters.sortBy : 'closingDate';
  const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;

  const query = buildFilterQuery(filters);

  const [data, total] = await Promise.all([
    Tender.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    Tender.countDocuments(query),
  ]);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

/**
 * Finds a single tender by Mongo _id or by the eTenders sourceId.
 */
export const getTenderById = async (id) => {
  const isNumeric = /^\d+$/.test(String(id));

  if (isNumeric) {
    const bySourceId = await Tender.findOne({ sourceId: Number(id) }).lean();
    if (bySourceId) return bySourceId;
  }

  const isValidObjectId = /^[a-f\d]{24}$/i.test(String(id));
  if (isValidObjectId) {
    return Tender.findById(id).lean();
  }

  return null;
};
