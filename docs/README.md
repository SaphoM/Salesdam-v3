# Salesdam Documentation Website

Complete documentation for the Salesdam CRM platform built with Astro.js.

## Overview

This documentation site provides:
- User guides for registration, authentication, and account management
- Complete API reference with interactive explorer
- Data model documentation (objects, fields, relationships)
- Architecture and system design documentation
- Developer guides for setup and development
- Searchable documentation interface

## Features

- 📚 Comprehensive documentation
- 🔍 Full-text search functionality
- 🎨 Clean, readable design (no Tailwind)
- 📱 Mobile responsive
- 🚀 Fast and lightweight (Astro.js)
- 🎯 Organized navigation sidebar
- 💻 Interactive API explorer
- 📊 System architecture diagrams

## Project Structure

```
docs/
├── src/
│   ├── pages/
│   │   ├── index.astro                 # Homepage
│   │   ├── search.astro                # Search page
│   │   ├── getting-started/
│   │   │   ├── quick-start.astro
│   │   │   ├── installation.astro
│   │   │   ├── project-structure.astro
│   │   │   └── [other pages]
│   │   ├── user-guide/
│   │   │   ├── registration.astro
│   │   │   ├── authentication.astro
│   │   │   ├── password-reset.astro
│   │   │   ├── user-management.astro
│   │   │   └── roles-permissions.astro
│   │   ├── data-model/
│   │   │   ├── objects.astro
│   │   │   ├── fields.astro
│   │   │   ├── standard-objects.astro
│   │   │   ├── custom-objects.astro
│   │   │   └── relationships.astro
│   │   ├── features/
│   │   │   ├── workspaces.astro
│   │   │   ├── dashboards.astro
│   │   │   ├── reports.astro
│   │   │   ├── automations.astro
│   │   │   └── integrations.astro
│   │   ├── architecture/
│   │   │   ├── system-architecture.astro
│   │   │   ├── database-schema.astro
│   │   │   ├── api-design.astro
│   │   │   └── tech-stack.astro
│   │   ├── api/
│   │   │   ├── overview.astro
│   │   │   ├── authentication.astro
│   │   │   ├── endpoints.astro
│   │   │   ├── explorer.astro
│   │   │   └── error-handling.astro
│   │   └── developer/
│   │       ├── setup.astro
│   │       ├── backend.astro
│   │       ├── frontend.astro
│   │       ├── testing.astro
│   │       └── deployment.astro
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Sidebar.astro
│   │   └── [other components]
│   ├── layouts/
│   │   └── MainLayout.astro
│   └── styles/
│       └── global.css
├── public/
│   └── favicon.svg
├── astro.config.mjs
├── package.json
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 16 or higher
- npm or yarn

### Installation

```bash
# Navigate to docs folder
cd docs

# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev
```

The site will be available at `http://localhost:3000`

### Building for Production

```bash
# Build the site
npm run build

# Preview production build locally
npm run preview
```

## Adding Documentation

### Creating a New Page

1. Create a new `.astro` file in the appropriate `src/pages/` subdirectory
2. Import the `MainLayout` component
3. Wrap content in the layout:

```astro
---
import MainLayout from '../../layouts/MainLayout.astro';
---

<MainLayout title="Page Title" description="Page description">
  <h1>Page Title</h1>
  <p>Your content here</p>
</MainLayout>
```

### Using Components

Common components available:
- `Header.astro` - Top navigation
- `Sidebar.astro` - Left sidebar navigation
- `MainLayout.astro` - Main page layout

### Styling

The documentation uses custom CSS without Tailwind. All styles are in `src/styles/global.css` and component-specific style blocks.

Common CSS classes:
- `.note` - Blue information box
- `.warning` - Yellow warning box
- `.success` - Green success message
- `.error` - Red error message
- `.badge` - Styled badges
- `.grid` - CSS Grid layout

## Search Functionality

The search feature in `src/pages/search.astro` indexes documentation pages. To add a page to search:

1. Edit `src/pages/search.astro`
2. Add an entry to the `pages` array with:
   - `title`: Page title
   - `description`: Short description
   - `path`: URL path
   - `keywords`: Array of search keywords

## API Explorer

The interactive API explorer is available at `/api/explorer`. Features:
- Test any API endpoint
- Add authentication tokens
- Send request bodies
- View formatted responses
- Preset buttons for common requests

## Deployment

### Build Output

The build creates a static site in the `dist/` folder. Deploy this folder to any static hosting:

- GitHub Pages
- Netlify
- Vercel
- AWS S3
- Any web server

### Example: Netlify

```bash
# Build the site
npm run build

# Netlify automatically deploys the dist/ folder
```

### Example: GitHub Pages

```bash
# Update astro.config.mjs with your site URL
# Deploy dist/ folder to gh-pages branch
```

## Writing Guidelines

### Documentation Best Practices

1. **Clear Headings:** Use H1 for page title, H2 for sections, H3 for subsections
2. **Short Paragraphs:** Keep paragraphs focused and under 100 words
3. **Code Examples:** Always include practical examples
4. **Tables:** Use for structured data comparisons
5. **Lists:** Use for sequential steps or feature lists
6. **Notes/Warnings:** Use for important information
7. **Internal Links:** Link to related documentation

### Code Examples

Format code examples with syntax highlighting:

```astro
<pre><code>// Your code here
const result = await fetch('/api/endpoint');
const data = await result.json();</code></pre>
```

### Images and Diagrams

ASCII diagrams work well for architecture:

```
┌─────────────────┐
│   Component     │
└─────────────────┘
```

## Performance

- Lightweight CSS (no framework)
- No JavaScript framework bloat
- Static generation = fast loads
- Optimized build size ~50KB gzipped

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

Guidelines for contributors:
1. Follow the directory structure
2. Use consistent naming conventions
3. Include examples in code documentation
4. Add new pages to the sidebar navigation
5. Test locally before submitting

## Maintenance

### Regular Updates

- Update API documentation when endpoints change
- Keep examples current with API versions
- Review and update field types documentation
- Refresh architecture diagrams as needed

### Checking Links

Broken links can be found by:
1. Checking sidebar navigation
2. Testing API explorer endpoints
3. Verifying all internal cross-links

## License

This documentation is part of the Salesdam project. All rights reserved.

## Support

For documentation issues or suggestions:
- Report issues: [GitHub Issues](https://github.com/your-org/salesdam-v3/issues)
- Request features: [GitHub Discussions](https://github.com/your-org/salesdam-v3/discussions)
- Email: docs@salesdam.com
