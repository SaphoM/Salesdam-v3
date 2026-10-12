import Tenant from '../models/Tenant.js';
import DynamicRecord from '../models/DynamicRecord.js';
import ObjectMeta from '../models/ObjectMeta.js';
import User from '../models/User.js';
import leadApprovalService from '../services/leadApprovalService.js';
import etendersService from '../services/etendersService.js';
import { asyncHandler, sendSuccess, AppError } from '../utils/errors.js';
import mongoose from 'mongoose';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;
const MAX_DATE_RANGE_DAYS = 180;
const CLOSED_LEAD_STATUSES = ['converted', 'lost', 'closed_won'];

const toDateOnly = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const defaultDateRange = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const defaultTo = new Date(today);
  defaultTo.setDate(defaultTo.getDate() + 90);
  return { fromDate: toDateOnly(today), toDate: toDateOnly(defaultTo) };
};

const clampDateRange = (fromDate, toDate) => {
  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T00:00:00`);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return defaultDateRange();
  }

  const minFrom = new Date(to);
  minFrom.setDate(minFrom.getDate() - MAX_DATE_RANGE_DAYS);
  if (from < minFrom) {
    // Keep the recent end of the range so wide configs still return current tenders
    return { fromDate: toDateOnly(minFrom), toDate };
  }

  return { fromDate, toDate };
};

const getMapField = (record, key) => {
  if (!record?.data) return undefined;
  if (typeof record.data.get === 'function') return record.data.get(key);
  return record.data[key];
};

const attachLinkedRecords = async (releases, tenantId) => {
  if (!releases?.length) return releases || [];

  const [leadObjMeta, dealObjMeta] = await Promise.all([
    ObjectMeta.findOne({ tenantId, apiName: 'lead' }).select('_id'),
    ObjectMeta.findOne({ tenantId, apiName: 'deal' }).select('_id'),
  ]);

  if (!leadObjMeta && !dealObjMeta) return releases;

  const tenderNumbers = [
    ...new Set(releases.map((tender) => tender.tenderNumber).filter(Boolean)),
  ];
  if (tenderNumbers.length === 0) return releases;

  const [linkedLeads, linkedDeals] = await Promise.all([
    leadObjMeta
      ? DynamicRecord.find({
          tenantId,
          objectId: leadObjMeta._id,
          objectApiName: 'lead',
          'data.rfq_number': { $in: tenderNumbers },
          'data.lead_source': 'tender',
          isDeleted: false,
        }).select('_id data')
      : Promise.resolve([]),
    dealObjMeta
      ? DynamicRecord.find({
          tenantId,
          objectId: dealObjMeta._id,
          objectApiName: 'deal',
          'data.rfq_number': { $in: tenderNumbers },
          isDeleted: false,
        }).select('_id data')
      : Promise.resolve([]),
  ]);

  const leadByRfq = new Map();
  for (const lead of linkedLeads) {
    const leadStatus = getMapField(lead, 'status');
    if (CLOSED_LEAD_STATUSES.includes(leadStatus)) continue;
    const rfq = getMapField(lead, 'rfq_number');
    if (rfq && !leadByRfq.has(rfq)) {
      leadByRfq.set(rfq, { id: lead._id, status: leadStatus });
    }
  }

  const dealByRfq = new Map();
  for (const deal of linkedDeals) {
    const rfq = getMapField(deal, 'rfq_number');
    if (rfq && !dealByRfq.has(rfq)) {
      dealByRfq.set(rfq, {
        id: deal._id,
        stage: getMapField(deal, 'stage'),
      });
    }
  }

  return releases.map((tender) => {
    if (!tender.tenderNumber) return tender;
    const linkedLead = leadByRfq.get(tender.tenderNumber);
    const linkedDeal = dealByRfq.get(tender.tenderNumber);
    if (!linkedLead && !linkedDeal) return tender;

    const enhanced = { ...tender };
    if (linkedLead) {
      enhanced.linkedLeadId = linkedLead.id;
      enhanced.linkedLeadStatus = linkedLead.status;
    }
    if (linkedDeal) {
      enhanced.linkedDealId = linkedDeal.id;
      enhanced.linkedDealStage = linkedDeal.stage;
    }
    return enhanced;
  });
};

const searchTenders = asyncHandler(async (req, res) => {
  const { pageNumber = 1, pageSize = DEFAULT_PAGE_SIZE } = req.query;

  const tenant = await Tenant.findById(req.user.tenantId).select(
    'tendersConfig',
  );
  if (!tenant) throw new AppError('Tenant not found', 404);

  const defaults = defaultDateRange();
  const config = tenant.tendersConfig || {
    fromDate: '',
    toDate: '',
    departments: [],
    provinces: [],
    categories: [],
  };

  const requestedPageSize = parseInt(pageSize, 10);
  const safePageSize = Number.isFinite(requestedPageSize)
    ? Math.min(Math.max(requestedPageSize, 1), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;

  const { fromDate, toDate } = clampDateRange(
    config.fromDate || defaults.fromDate,
    config.toDate || defaults.toDate,
  );

  const filters = {
    pageNumber: parseInt(pageNumber, 10) || 1,
    pageSize: safePageSize,
    fromDate,
    toDate,
    provinces: config.provinces || [],
    departments: config.departments || [],
    categories: config.categories || [],
  };

  const result = await etendersService.fetchTenders(filters);
  const enhancedReleases = await attachLinkedRecords(
    result.releases,
    req.user.tenantId,
  );

  sendSuccess(res, {
    data: enhancedReleases,
    meta: {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      links: result.links,
    },
  });
});

const saveTenderAsLead = asyncHandler(async (req, res) => {
  const { tender, supportDocuments } = req.body;

  if (!tender) {
    throw new AppError('Tender data is required', 400);
  }

  // Start a session for transactional operations
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get ObjectMeta for lead and support_document
    const leadObjMeta = await ObjectMeta.findOne({
      tenantId: req.user.tenantId,
      apiName: 'lead',
    }).session(session);

    if (!leadObjMeta) {
      throw new AppError('Lead object metadata not found', 404);
    }

    const supportDocObjMeta = await ObjectMeta.findOne({
      tenantId: req.user.tenantId,
      apiName: 'support_document',
    }).session(session);

    if (!supportDocObjMeta) {
      throw new AppError('Support document object metadata not found', 404);
    }

    const contactName = tender.contactPerson || '';
    const nameParts = contactName.split(' ').filter(Boolean);
    const firstName = nameParts[0] || 'Tender';
    const lastName =
      nameParts.length > 1
        ? nameParts.slice(1).join(' ')
        : tender.tenderNumber || 'Lead';

    const leadData = {
      first_name: firstName,
      last_name: lastName,
      client: tender.client || tender.department || '',
      email: tender.email || '',
      phone: tender.telephone || '',
      lead_source: 'tender',
      status: 'open',
      country: 'south_africa',
      sales_rep: req.user._id,
    };

    if (tender.tenderNumber) {
      leadData.rfq_number = tender.tenderNumber;
    }

    if (tender.title) {
      leadData.product_description = tender.title;
    }

    if (tender.closingDate) {
      leadData.closing_date = tender.closingDate;
    }

    if (tender.province) {
      leadData.province = tender.province;
    }

    if (tender.description || tender.conditions) {
      leadData.technical_scope = tender.description || tender.conditions;
    }

    if (
      tender.briefingVenue ||
      tender.streetName ||
      tender.suburb ||
      tender.town
    ) {
      if (tender.streetName) {
        leadData.street = tender.streetName;
      }
      if (tender.suburb) {
        leadData.city = tender.suburb;
      }
      if (tender.town) {
        leadData.city = tender.town;
      }
      if (tender.code) {
        leadData.zip = tender.code;
      }

      const briefingAddressParts = [
        tender.briefingVenue,
        tender.streetName,
        tender.suburb,
        tender.town,
        tender.code,
      ].filter(Boolean);
      if (briefingAddressParts.length > 0) {
        leadData.briefing_address = briefingAddressParts.join(', ');
      }
    }

    if (tender.validity) {
      leadData.quote_validity_period = parseInt(tender.validity) || null;
    }

    if (tender.briefingDate) {
      leadData.briefing_date_time = tender.briefingDate;
    }

    if (
      tender.briefingCompulsory !== undefined &&
      tender.briefingCompulsory !== null
    ) {
      leadData.compulsory_briefing = tender.briefingCompulsory ? 'yes' : 'no';
    }

    const lead = new DynamicRecord({
      tenantId: req.user.tenantId,
      objectId: leadObjMeta._id,
      objectApiName: 'lead',
      ownerId: req.user._id,
      createdBy: req.user._id,
      lastModifiedBy: req.user._id,
    });

    Object.entries(leadData).forEach(([key, value]) => {
      if (value) {
        lead.setField(key, value);
      }
    });

    await lead.save({ session });

    const leadId = lead._id.toString();

    // Save support documents within the same transaction
    if (leadId && supportDocuments && supportDocuments.length > 0) {
      const docSavePromises = supportDocuments.map((doc) =>
        DynamicRecord.create(
          [
            {
              tenantId: req.user.tenantId,
              objectId: supportDocObjMeta._id,
              objectApiName: 'support_document',
              createdBy: req.user._id,
              lastModifiedBy: req.user._id,
            },
          ],
          { session },
        ).then((docRecords) => {
          const docRecord = docRecords[0];
          docRecord.setField('document_name', doc.fileName || '');
          docRecord.setField('document_type', doc.extension || '');
          docRecord.setField('document_url', doc.url || '');
          docRecord.setField('file_format', doc.extension || '');
          docRecord.setField(
            'date_published',
            doc.datePublished || new Date().toISOString(),
          );
          docRecord.setField(
            'date_modified',
            doc.dateModified || new Date().toISOString(),
          );
          docRecord.setField('lead_id', leadId);
          return docRecord.save({ session });
        }),
      );

      await Promise.all(docSavePromises);
    }

    // Commit the transaction
    await session.commitTransaction();

    sendSuccess(
      res,
      {
        data: {
          _id: lead._id,
          message: 'Tender saved as lead with support documents successfully',
        },
      },
      201,
    );
  } catch (err) {
    // Abort the transaction on any error
    await session.abortTransaction();
    throw err;
  } finally {
    // End the session
    session.endSession();
  }
});

const convertTenderToDeal = asyncHandler(async (req, res) => {
  const { tender, clientId, supportDocuments } = req.body;

  if (!tender) {
    throw new AppError('Tender data is required', 400);
  }
  if (!clientId) {
    throw new AppError('Client is required', 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(
      req.user._id,
      'firstName lastName email',
    ).session(session);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const deal = await leadApprovalService.convertTenderToDeal(
      req.user.tenantId,
      tender,
      user,
      clientId,
      supportDocuments || tender.supportDocuments || [],
      session,
    );

    await session.commitTransaction();

    sendSuccess(
      res,
      {
        data: {
          deal: deal.toDataObject ? deal.toDataObject() : deal,
          dealId: deal._id,
          message: 'Tender converted to deal successfully',
        },
      },
      201,
    );
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
});

const getDocumentProxy = asyncHandler(async (req, res) => {
  const { url } = req.query;

  if (!url) {
    throw new AppError('Document URL is required', 400);
  }

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Salesdam/1.0',
      },
    });

    if (!response.ok) {
      throw new AppError('Failed to fetch document', response.status);
    }

    const contentType = response.headers.get('content-type');
    const buffer = await response.arrayBuffer();

    res.set('Content-Type', contentType || 'application/octet-stream');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(Buffer.from(buffer));
  } catch (err) {
    throw new AppError(
      `Failed to fetch document: ${err.message}`,
      400,
    );
  }
});

export { searchTenders, saveTenderAsLead, convertTenderToDeal, getDocumentProxy };