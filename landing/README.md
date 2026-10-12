# Mini CRM Landing Site

A comprehensive Astro JS landing page and documentation site for Mini CRM.

## Project Structure

```
landing/
├── src/
│   ├── pages/              # All pages (16 total)
│   │   ├── index.astro                    # Landing homepage
│   │   ├── getting-started.astro          # Getting started guide
│   │   ├── user-guide/                    # User documentation (7 pages)
│   │   │   ├── index.astro
│   │   │   ├── objects.astro
│   │   │   ├── records.astro
│   │   │   ├── automation.astro
│   │   │   ├── dashboards.astro
│   │   │   ├── users-roles.astro
│   │   │   ├── integrations.astro
│   │   │   └── analytics.astro
│   │   └── developer/                     # Developer docs (6 pages)
│   │       ├── index.astro
│   │       ├── architecture.astro
│   │       ├── authentication.astro
│   │       ├── data-model.astro
│   │       ├── features.astro
│   │       └── api.astro
│   ├── layouts/            # Layout components
│   │   ├── BaseLayout.astro
│   │   ├── DocsLayout.astro
│   │   └── DevLayout.astro
│   └── components/         # Reusable components
│       ├── Header.astro
│       ├── Footer.astro
│       ├── PlanCard.astro
│       ├── FeatureCard.astro
│       └── DocsSidebar.astro
├── public/                 # Static assets
├── package.json
└── astro.config.mjs
```

## Features

- **Landing Page**: Hero section, features, pricing, testimonials, CTAs
- **Getting Started Guide**: Comprehensive onboarding walkthrough
- **User Guide**: 7 detailed pages covering all features
- **Developer Guide**: 6 technical pages for developers (internal)
- **NO Tailwind**: Pure CSS with CSS variables
- **NO TypeScript**: Pure JavaScript .astro files
- **Responsive**: Mobile-friendly design
- **Professional**: Clean SaaS look with primary color #0066FF

## Pages

### Public Pages
1. `/` - Landing homepage
2. `/getting-started` - Getting started guide
3. `/user-guide` - User guide index
4. `/user-guide/objects` - Object Settings
5. `/user-guide/records` - Records management
6. `/user-guide/automation` - Automation flows
7. `/user-guide/dashboards` - Dashboards
8. `/user-guide/users-roles` - Users & Roles
9. `/user-guide/integrations` - Integrations & API
10. `/user-guide/analytics` - Analytics

### Internal Pages (Developer)
11. `/developer` - Developer guide index
12. `/developer/architecture` - System architecture
13. `/developer/authentication` - Auth implementation
14. `/developer/data-model` - Database schemas
15. `/developer/features` - Feature implementation
16. `/developer/api` - API reference

## Running the Site

### Development
```bash
npm run dev
```
Runs on http://localhost:4321

### Build
```bash
npm run build
```
Output in `dist/`

### Preview
```bash
npm run preview
```

## Styling

- **Primary Color**: #0066FF
- **Background**: #f8fafc
- **Text**: #0f172a
- **Font**: system-ui, -apple-system, sans-serif
- **Card Style**: White background, 12px border-radius, subtle shadows

## Links to Main App

- Registration: http://localhost:3000/register
- Login: http://localhost:3000/login
- Frontend: http://localhost:3000
- Backend API: http://localhost:5001

## Notes

- Developer section is linked only in footer (internal docs)
- All content is real and comprehensive (not placeholders)
- Each page has detailed, actionable information
- Documentation covers technical implementation details
- Responsive design works on all screen sizes
