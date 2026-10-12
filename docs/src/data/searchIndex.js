import { ALL_PAGES } from './navigation.js';
import { OPERATIONS } from './openapi.js';

/**
 * The search index, built at build time from the nav tree and the OpenAPI spec.
 *
 * This replaces the hardcoded 8-entry array the old /search page carried, which
 * covered a third of the site and had to be edited by hand whenever a page was
 * added. Deriving it from the same sources the sidebar and explorer use means a
 * new page or endpoint is searchable the moment it is listed.
 *
 * It is a metadata index (title, description, keywords, section), not full text:
 * pages are hand-written .astro with no content collections, so there is no
 * body text to extract without parsing components. Searching titles,
 * descriptions and endpoint paths covers the "where is X" case that matters;
 * full-text would mean migrating pages to content collections first.
 */

/** Extra terms per path, for vocabulary a title doesn't contain. */
const KEYWORDS = {
  '/': ['introduction', 'overview', 'home', 'start here'],
  '/getting-started/quick-start': ['first call', 'curl', 'hello world', 'setup'],
  '/getting-started/installation': ['npm', 'mongodb', 'docker', 'env', 'environment variables'],
  '/getting-started/project-structure': ['folders', 'monorepo', 'layout'],
  '/api/overview': ['base url', 'envelope', 'versioning', 'status codes', 'rest'],
  '/api/authentication': ['api key', 'x-api-key', 'session', 'cookie', 'scopes', 'ip whitelist', 'token', 'login'],
  '/api/reference': ['endpoints', 'explorer', 'swagger', 'openapi', 'try it', 'schema'],
  '/api/pagination': ['page', 'limit', 'sort', 'filter', 'query', 'views'],
  '/api/error-handling': ['errors', '400', '401', '403', '404', '500', 'validation'],
  '/api/rate-limits': ['throttle', '429', 'limits'],
  '/data-model/objects': ['metadata', 'custom object', 'standard object', 'apiname'],
  '/data-model/fields': ['field types', 'picklist', 'lookup', 'currency', 'text'],
  '/data-model/relationships': ['lookup', 'master detail', 'cascade', 'parent', 'child'],
  '/concepts/formula-fields': ['formula', 'expression', 'return type', 'ROUND', 'IF', 'ISBLANK', 'computed'],
  '/concepts/rollup-summaries': ['rollup', 'sum', 'count', 'avg', 'aggregate', 'child records'],
  '/concepts/validation-rules': ['validation', 'rule', 'block save', 'error message', 'cross-field'],
  '/features/quotes': ['quote', 'pdf'],
  '/features/orders': ['order', 'line item'],
  '/features/invoices': ['invoice', 'billing', 'payment'],
  '/features/deal-line-items': ['line item', 'markup', 'subtotal'],
  '/features/lead-conversion': ['lead', 'convert', 'client'],
  '/features/tenders': ['tender', 'etenders'],
  '/user-guide/registration': ['sign up', 'tenant', 'onboarding'],
  '/user-guide/authentication': ['login', 'session', 'verify email'],
  '/user-guide/password-reset': ['forgot password', 'reset'],
  '/user-guide/roles-permissions': ['role', 'permission', 'access', 'sharing'],
  '/architecture/system-architecture': ['services', 'topology', 'diagram'],
  '/architecture/api-design': ['conventions', 'rest', 'versioning'],
  '/architecture/tech-stack': ['react', 'express', 'mongodb', 'astro', 'vite'],
  '/developer/setup': ['local', 'dev server', 'run'],
  '/developer/backend': ['express', 'controller', 'service', 'route', 'mongoose'],
  '/developer/frontend': ['react', 'css modules', 'design tokens', 'components'],
};

/** Documentation pages. */
const pageEntries = ALL_PAGES.map((p) => ({
  kind: 'page',
  title: p.title,
  description: p.description,
  path: p.path,
  section: p.section,
  keywords: KEYWORDS[p.path] || [],
}));

/** One entry per documented endpoint, so "POST /records" finds the explorer. */
const endpointEntries = OPERATIONS.map((op) => ({
  kind: 'endpoint',
  title: `${op.method} ${op.path}`,
  description: op.summary,
  // Deep-links into the explorer, which opens the matching operation on load.
  path: `/api/reference#${op.id}`,
  section: op.tag,
  method: op.method,
  keywords: [op.tag.toLowerCase(), ...op.path.split(/[/{}\-]+/).filter(Boolean)],
}));

export const SEARCH_INDEX = [...pageEntries, ...endpointEntries];
