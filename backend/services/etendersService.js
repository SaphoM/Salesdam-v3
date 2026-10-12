import axios from 'axios';
import https from 'https';
import logger from '../utils/logger.js';

const ETENDERS_API_BASE =
  process.env.ETENDERS_API_URL || 'https://ocds-api.etenders.gov.za/api';
const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map();

const httpsAgent = new https.Agent({
  rejectUnauthorized: process.env.NODE_ENV === 'production',
});

const formatDateToYYYYMMDD = (date) => {
  if (!date) return null;

  // If already in yyyy-mm-dd format, return as-is
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  // Parse the date
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Check if valid date
  if (isNaN(dateObj.getTime())) {
    logger.warn(`Invalid date provided: ${date}`);
    return null;
  }

  // Return in yyyy-mm-dd format
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const etendersClient = axios.create({
  baseURL: ETENDERS_API_BASE,
  timeout: 60000,
  httpsAgent,
  headers: {
    Accept: 'application/json',
  },
});

const getCacheKey = (filters) => {
  const {
    pageNumber = 1,
    pageSize = 50,
    fromDate = '',
    toDate = '',
  } = filters;
  return `tenders_${pageNumber}_${pageSize}_${fromDate}_${toDate}`;
};

const getCachedTenders = (cacheKey) => {
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    logger.info(`Cache hit for ${cacheKey}`);
    return cached.data;
  }
  return null;
};

const setCachedTenders = (cacheKey, data) => {
  cache.set(cacheKey, { data, timestamp: Date.now() });
};

const transformReleases = (rawReleases) => {
  return rawReleases.map((release) => {
    const tender = release.tender || {};
    const tenderPeriod = tender.tenderPeriod || {};
    const enquiryPeriod = tender.enquiryPeriod || {};
    const contactPerson = tender.contactPerson || {};
    const briefingSession = tender.briefingSession || {};

    const supportDocuments = (tender.documents || []).map((doc) => ({
      fileName: doc.title || '',
      lastModifiedBy: doc.author || 'N/A',
      dateModified: doc.dateModified || doc.datePublished || '',
      active: true,
      extension: doc.format || 'pdf',
      url: doc.url || null,
    }));

    return {
      ocid: release.ocid,
      id: release.ocid,
      date: release.date,
      title: tender.title || '',
      tenderNumber: tender.title || '',
      status: tender.status || 'Open',
      category: tender.category || '',
      province: tender.province || '',
      description: tender.description || '',
      client: release.buyer?.name || '',
      department: tender.procuringEntity?.name || '',
      deliveryLocation: tender.deliveryLocation || '',
      specialConditions: tender.specialConditions || '',
      mainProcurementCategory: tender.mainProcurementCategory || '',
      value: tender.value || { amount: 0, currency: 'ZAR' },
      documents: tender.documents || [],
      supportDocuments,
      datePublished: tender.date || '',
      closingDate: tenderPeriod.endDate || '',
      // briefingDate: enquiryPeriod.startDate || '',
      tenderPeriod,
      enquiryPeriod,
      awardPeriod: tender.awardPeriod || {},
      contactPerson: contactPerson.name || '',
      email: contactPerson.email || '',
      telephone: contactPerson.telephoneNumber || '',
      fax: '',
      username: '',
      conditions: tender.specialConditions || '',
      briefingSession: briefingSession.isSession ? 'Yes' : 'No',
      briefingCompulsory: briefingSession.compulsory ? 'Yes' : 'No',
      briefingVenue: briefingSession.venue || '',
      briefingDate: briefingSession.date || '',
      streetName: tender.deliveryLocation || '',
      suburb: '',
      town: '',
      code: '',
      eSubmission: false,
      twoEnvelopeSubmission: false,
      validity: '',
      procurementMethod: tender.procurementMethod || '',
      procurementMethodDetails: tender.procurementMethodDetails || '',
    };
  });
};

const applyFilters = (releases, filters) => {
  const { provinces = [], departments = [], categories = [] } = filters;
  let filtered = releases;

  if (provinces.length > 0) {
    filtered = filtered.filter((r) =>
      provinces.some((p) =>
        r.province?.toLowerCase().includes(p.toLowerCase()),
      ),
    );
  }

  if (departments.length > 0) {
    filtered = filtered.filter((r) =>
      departments.some((d) =>
        r.department?.toLowerCase().includes(d.toLowerCase()),
      ),
    );
  }

  if (categories.length > 0) {
    filtered = filtered.filter((r) =>
      categories.some((c) =>
        r.category?.toLowerCase().includes(c.toLowerCase()),
      ),
    );
  }

  return filtered;
};

const sortByClosingDate = (releases) => {
  return [...releases].sort((a, b) => {
    // Handle missing closing dates
    if (!a.closingDate && !b.closingDate) return 0;
    if (!a.closingDate) return 1; // Items without closing date go to end
    if (!b.closingDate) return -1;

    // Sort by closing date (earliest first)
    const dateA = new Date(a.closingDate).getTime();
    const dateB = new Date(b.closingDate).getTime();
    return dateA - dateB;
  });
};

const fetchTenders = async (filters = {}) => {
  const {
    pageNumber = 1,
    pageSize = 50,
    fromDate,
    toDate,
    provinces = [],
    departments = [],
    categories = [],
  } = filters;

  const cacheKey = getCacheKey({ pageNumber, pageSize, fromDate, toDate });

  try {
    const cachedResult = getCachedTenders(cacheKey);

    if (cachedResult) {
      const filtered = applyFilters(cachedResult.releases, {
        provinces,
        departments,
        categories,
      });
      const sorted = sortByClosingDate(filtered);
      return {
        releases: sorted,
        total: sorted.length,
        links: cachedResult.links || {},
        page: pageNumber,
        pageSize,
        fromCache: true,
      };
    }

    logger.info(
      `Fetching tenders from API - Page: ${pageNumber}, Size: ${pageSize}`,
    );

    const params = {
      PageNumber: pageNumber,
      PageSize: pageSize,
    };

    const formattedFromDate = formatDateToYYYYMMDD(fromDate);
    const formattedToDate = formatDateToYYYYMMDD(toDate);

    if (formattedFromDate) {
      params.dateFrom = formattedFromDate;
    }

    if (formattedToDate) {
      params.dateTo = formattedToDate;
    }

    const response = await etendersClient.get('/OCDSReleases', { params });

    if (!response.data?.releases) {
      return {
        releases: [],
        total: 0,
        links: response.data?.links || {},
      };
    }

    const transformedReleases = transformReleases(response.data.releases);

    setCachedTenders(cacheKey, {
      releases: transformedReleases,
      links: response.data?.links || {},
    });

    const filtered = applyFilters(transformedReleases, {
      provinces,
      departments,
      categories,
    });
    const sorted = sortByClosingDate(filtered);

    return {
      releases: sorted,
      total: sorted.length,
      links: response.data?.links || {},
      page: pageNumber,
      pageSize,
    };
  } catch (error) {
    logger.error('Error fetching tenders from etenders API:', error.message);
    const stale = cache.get(cacheKey);
    if (stale?.data?.releases) {
      logger.warn('Returning stale tenders cache after upstream failure');
      const filtered = applyFilters(stale.data.releases, {
        provinces,
        departments,
        categories,
      });
      const sorted = sortByClosingDate(filtered);
      return {
        releases: sorted,
        total: sorted.length,
        links: stale.data.links || {},
        page: pageNumber,
        pageSize,
        fromCache: true,
      };
    }
    throw new Error(`Failed to fetch tenders: ${error.message}`);
  }
};

export default {
  fetchTenders,
};
