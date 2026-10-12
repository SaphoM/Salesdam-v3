import { defineConfig } from 'astro/config';

// Static output. There is no SSR adapter, so the docs cannot run server-side
// middleware — the auth gate in src/components/AuthGate.astro is therefore a
// client-side check. See the note in that file about what it does and does not
// protect.
export default defineConfig({
  integrations: [],
  // lucide-astro renders to plain SVG markup at build time, so unlike the
  // lucide-react dependency this replaces, it needs no ssr.external entry and
  // ships no client-side JS.
});
