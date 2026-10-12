export const FEATURES = {
  dashboards: import.meta.env.VITE_FEATURE_DASHBOARDS === 'true',
  automation: import.meta.env.VITE_FEATURE_AUTOMATION === 'true',
  emailTemplates: import.meta.env.VITE_FEATURE_EMAIL_TEMPLATES === 'true',
  emailSenders: import.meta.env.VITE_FEATURE_EMAIL_SENDERS === 'true',
  pdfTemplates: import.meta.env.VITE_FEATURE_PDF_TEMPLATES === 'true',
  integrations: import.meta.env.VITE_FEATURE_INTEGRATIONS === 'true',
};
