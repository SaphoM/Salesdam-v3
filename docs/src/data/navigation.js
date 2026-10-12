/**
 * The documentation tree — the single source of truth for the sidebar, the
 * search index and the prev/next page links.
 *
 * Every entry here must resolve to a real page under src/pages. The previous
 * hardcoded sidebar linked 20 pages that were never written (dead links on every
 * screen) while omitting 7 pages that did exist, including /search. Keeping one
 * list, consumed by everything, is what stops that drifting again — see
 * `npm run check:links`, which fails the build on a mismatch.
 */
export const NAV = [
  {
    title: 'Getting Started',
    items: [
      { title: 'Introduction', path: '/', description: 'What Salesdam is and how the pieces fit together.' },
      { title: 'Quick Start', path: '/getting-started/quick-start', description: 'Get a local instance running and make your first API call.' },
      { title: 'Installation', path: '/getting-started/installation', description: 'Prerequisites, environment variables and running the stack.' },
      { title: 'Project Structure', path: '/getting-started/project-structure', description: 'How the repo is laid out: backend, frontend, docs, landing.' },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { title: 'Overview', path: '/api/overview', description: 'Base URL, versioning, response envelope and status codes.' },
      { title: 'Authentication', path: '/api/authentication', description: 'Session cookies, bearer tokens, API keys, scopes and IP allow-lists.' },
      { title: 'Endpoint Explorer', path: '/api/reference', description: 'Every documented endpoint, with schemas and a live request runner.' },
      { title: 'Pagination & Filtering', path: '/api/pagination', description: 'page, limit, sort, search, filter and saved views.' },
      { title: 'Errors', path: '/api/error-handling', description: 'Error envelope, validation errors and how to handle each status.' },
      { title: 'Rate Limits', path: '/api/rate-limits', description: 'Which routes are throttled and what the limits are.' },
    ],
  },
  {
    title: 'Platform Concepts',
    items: [
      { title: 'Objects', path: '/data-model/objects', description: 'Standard and custom objects, and the metadata that defines them.' },
      { title: 'Fields & Types', path: '/data-model/fields', description: 'Every field type and the properties each one supports.' },
      { title: 'Formula Fields', path: '/concepts/formula-fields', description: 'Expression syntax, functions, return types and evaluation order.' },
      { title: 'Rollup Summaries', path: '/concepts/rollup-summaries', description: 'Aggregating child records onto a parent.' },
      { title: 'Validation Rules', path: '/concepts/validation-rules', description: 'Cross-field rules that block a save, and how they are evaluated.' },
      { title: 'Relationships', path: '/data-model/relationships', description: 'Lookups, master-detail and cascade behaviour.' },
    ],
  },
  {
    title: 'Features',
    items: [
      { title: 'Quotes', path: '/features/quotes', description: 'Quote lifecycle and PDF generation.' },
      { title: 'Orders', path: '/features/orders', description: 'Orders and order line items.' },
      { title: 'Invoices', path: '/features/invoices', description: 'Invoicing and payment tracking.' },
      { title: 'Deal Line Items', path: '/features/deal-line-items', description: 'Line items, markup and rolled-up totals.' },
      { title: 'Lead Conversion', path: '/features/lead-conversion', description: 'Converting a lead into a client and deal.' },
      { title: 'Tenders', path: '/features/tenders', description: 'Tender search and tracking.' },
    ],
  },
  {
    title: 'User Guide',
    items: [
      { title: 'Registration & Setup', path: '/user-guide/registration', description: 'Creating a tenant and the first user.' },
      { title: 'Authentication', path: '/user-guide/authentication', description: 'Signing in, sessions and email verification.' },
      { title: 'Password Reset', path: '/user-guide/password-reset', description: 'The reset flow end to end.' },
      { title: 'Roles & Permissions', path: '/user-guide/roles-permissions', description: 'Roles, app permissions and object-level access.' },
    ],
  },
  {
    title: 'Architecture',
    items: [
      { title: 'System Architecture', path: '/architecture/system-architecture', description: 'Services, data flow and deployment topology.' },
      { title: 'API Design', path: '/architecture/api-design', description: 'Conventions behind the REST surface.' },
      { title: 'Tech Stack', path: '/architecture/tech-stack', description: 'Languages, frameworks and infrastructure.' },
    ],
  },
  {
    title: 'Developer Guide',
    items: [
      { title: 'Local Setup', path: '/developer/setup', description: 'Running the stack for development.' },
      { title: 'Backend', path: '/developer/backend', description: 'Route, controller and service layout; adding an endpoint.' },
      { title: 'Frontend', path: '/developer/frontend', description: 'Component conventions, CSS modules and design tokens.' },
    ],
  },
];

/** Flat list of every documented page, in sidebar order. */
export const ALL_PAGES = NAV.flatMap((section) =>
  section.items.map((item) => ({ ...item, section: section.title })),
);

/** Resolve the previous/next page for footer navigation. */
export function siblings(pathname) {
  const i = ALL_PAGES.findIndex((p) => p.path === pathname);
  if (i === -1) return { prev: null, next: null };
  return {
    prev: i > 0 ? ALL_PAGES[i - 1] : null,
    next: i < ALL_PAGES.length - 1 ? ALL_PAGES[i + 1] : null,
  };
}

/** The section a path belongs to, so the sidebar can auto-expand it. */
export function sectionFor(pathname) {
  return NAV.find((s) => s.items.some((i) => i.path === pathname))?.title || null;
}
