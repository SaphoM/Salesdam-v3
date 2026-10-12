import axios from 'axios';
import env from '../config/env.js';

/**
 * The eTenders portal endpoint is a server-side DataTable. It expects a
 * "columns[i][...]" bracketed query string. We rebuild that shape here
 * exactly as the site sends it, only varying start/length/draw.
 */
const DATATABLE_COLUMNS = [
  { data: '', orderable: false },
  { data: 'category', orderable: true },
  { data: 'description', orderable: false },
  { data: 'eSubmission', orderable: true },
  { data: 'date_Published', orderable: true },
  { data: 'closing_Date', orderable: true },
  { data: 'actions', orderable: true },
];

const buildColumnsQueryString = () =>
  DATATABLE_COLUMNS.map((column, index) => {
    const prefix = `columns%5B${index}%5D`;
    return [
      `${prefix}%5Bdata%5D=${encodeURIComponent(column.data)}`,
      `${prefix}%5Bname%5D=`,
      `${prefix}%5Bsearchable%5D=true`,
      `${prefix}%5Borderable%5D=${column.orderable}`,
      `${prefix}%5Bsearch%5D%5Bvalue%5D=`,
      `${prefix}%5Bsearch%5D%5Bregex%5D=false`,
    ].join('&');
  }).join('&');

export const buildEtendersUrl = ({ draw, start, length }) => {
  const columnsQuery = buildColumnsQueryString();

  const params = [
    `draw=${draw}`,
    columnsQuery,
    `order%5B0%5D%5Bcolumn%5D=2`,
    `order%5B0%5D%5Bdir%5D=desc`,
    `start=${start}`,
    `length=${length}`,
    `search%5Bvalue%5D=`,
    `search%5Bregex%5D=false`,
    `status=${env.etendersStatus}`,
    `_=${Date.now()}`,
  ].join('&');

  return `${env.etendersBaseUrl}?${params}`;
};

/**
 * Fetches a single page of raw tender records from eTenders.
 */
export const fetchPage = async ({ draw, start, length }) => {
  const url = buildEtendersUrl({ draw, start, length });

  const response = await axios.get(url, {
    timeout: env.etendersRequestTimeoutMs,
    headers: {
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent':
        'Mozilla/5.0 (compatible; etenders-service/1.0; +https://example.com)',
    },
  });

  return response.data; // { draw, recordsTotal, recordsFiltered, data: [...] }
};

/**
 * Fetches every page from eTenders and returns the combined raw records.
 * Pages through using recordsTotal from the first response.
 */
export const fetchAllTenders = async ({ pageSize = env.fetchPageSize } = {}) => {
  let start = 0;
  let draw = 1;
  let recordsTotal = Infinity;
  const allRecords = [];

  while (start < recordsTotal) {
    // eslint-disable-next-line no-await-in-loop
    const page = await fetchPage({ draw, start, length: pageSize });

    recordsTotal = Number(page.recordsTotal) || 0;
    const records = Array.isArray(page.data) ? page.data : [];
    allRecords.push(...records);

    // Safety valve: stop if the source returns an empty page before we
    // reach recordsTotal, to avoid looping forever.
    if (records.length === 0) break;

    start += pageSize;
    draw += 1;
  }

  return allRecords;
};
