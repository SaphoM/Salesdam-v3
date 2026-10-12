const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, AlignmentType, WidthType, ImageRun, PageBreak } = require("docx");
const fs = require("fs");
const path = require("path");

// Create a new document
const doc = new Document({
  sections: [
    {
      properties: {},
      children: [
        // Title Page
        new Paragraph({
          text: "Salesdam V3 Insurance Workspace",
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          text: "Implementation Delivery Document",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          text: "",
        }),
        new Paragraph({
          text: "Version 1.0",
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          text: "Date: October 11, 2026",
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          text: "Classification: Confidential - Internal Use",
          alignment: AlignmentType.CENTER,
        }),
        new PageBreak(),

        // Table of Contents placeholder
        new Paragraph({
          text: "Table of Contents",
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          text: "1. Executive Summary",
        }),
        new Paragraph({
          text: "2. Project Overview",
        }),
        new Paragraph({
          text: "3. Architecture Overview",
        }),
        new Paragraph({
          text: "4. Core Platform Implementation",
        }),
        new Paragraph({
          text: "5. Insurance Domain Implementation",
        }),
        new Paragraph({
          text: "5.1 New Business Flow",
        }),
        new Paragraph({
          text: "5.2 Policy Servicing",
        }),
        new Paragraph({
          text: "5.3 Claims Management",
        }),
        new Paragraph({
          text: "5.4 Billing & Collections",
        }),
        new Paragraph({
          text: "5.5 Endorsements & Approvals",
        }),
        new Paragraph({
          text: "5.6 Communications & Notifications",
        }),
        new Paragraph({
          text: "5.7 Document Generation",
        }),
        new Paragraph({
          text: "5.8 Scheduler & Automation",
        }),
        new Paragraph({
          text: "6. Communication & Notification System",
        }),
        new Paragraph({
          text: "7. Document Generation & Delivery",
        }),
        new Paragraph({
          text: "8. Scheduler & Background Jobs",
        }),
        new Paragraph({
          text: "9. Deployment & Operations",
        }),
        new Paragraph({
          text: "10. Testing & Quality Assurance",
        }),
        new Paragraph({
          text: "11. Appendix - File Structure",
        }),
        new PageBreak(),

        // 1. Executive Summary
        new Paragraph({
          text: "1. Executive Summary",
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          text: "This document provides a comprehensive overview of the Salesdam V3 Insurance Workspace implementation. The Insurance Workspace is a multi-tenant, metadata-driven extension of the Salesdam V3 Platform Core, delivering a complete funeral insurance policy management and CRM solution.",
        }),
        new Paragraph({
          text: "",
        }),
        new Paragraph({
          text: "Key Achievements:",
          bold: true,
        }),
        new Paragraph({
          text: "• 20 insurance metadata objects implemented, opt-in per tenant via the existing metadata engine",
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: "• Complete new business flow: Lead → Application → Quote → Acceptance → Submit → Issue",
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: "• Policy servicing state machine: Lapse, Reinstate, Suspend, Cancel, Close with validation",
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: "• Claims lifecycle: Intake → Requirements → Assessment → Approval → Payout (separate ledger)",
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: "• Billing engine with FIFO allocation, billing keys, idempotency, paid-through date",
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: "• Arrears & lapse rule: 3 non-consecutive missed payments, grace periods, configurable thresholds",
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: "• Multi-stage endorsement approval workflow (Underwriting → Management)",
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: "• Communication template system with dynamic field substitution and multi-channel support",
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: "• Policy document generation (HTML + PDF) with versioning and automatic email delivery",
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: "• Unified scheduler with systemd integration for all periodic jobs",
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: "",
        }),
        new Paragraph({
          text: "Test Coverage: 147 automated checks passing across 16 test suites (130 integration + 17 unit tests).",
          bold: true,
        }),
        new PageBreak(),

        // 2. Project Overview
        new Paragraph({
          text: "2. Project Overview",
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          text: "2.1 Background",
        }),
        new Paragraph({
          text: "The Salesdam V3 Insurance Workspace is a multi-tenant extension of the Salesdam V3 Platform Core, designed to deliver a complete funeral insurance policy management and CRM solution. The BRD (Business Requirements Document) v1.0 dated October 6, 2026 defines the requirements.",
        }),
        new Paragraph({
          text: "",
        }),
        new Paragraph({
          text: "2.2 Scope",
        }),
        new Paragraph({
          text: "The Insurance Workspace implements all BRD sections 2-23, covering the complete insurance lifecycle from lead capture through policy issuance, servicing, claims, billing, collections, communications, and reporting. The workspace is opt-in per tenant (hub='insurance') and reuses all Platform Core capabilities (metadata engine, auth, permissions, workflows, approvals, files, audit, reporting, integrations).",
        }),
        new Paragraph({
          text: "",
        }),
        new Paragraph({
          text: "2.3 Technology Stack",
        }),
        const techTable = new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Component", bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: "Technology", bold: true })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Backend" })] }),
                new TableCell({ children: [new Paragraph({ text: "Node.js (ESM), Express, Mongoose, MongoDB (replica set rs0)" })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Frontend" })] }),
                new TableCell({ children: [new Paragraph({ text: "React, Vite" })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Database" })] }),
                new TableCell({ children: [new Paragraph({ text: "MongoDB with replica set (rs0) for transactions" })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Testing" })] }),
                new TableCell({ children: [new Paragraph({ text: "Jest (unit), Node.js test runner (e2e)" })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Deployment" })] }),
                new TableCell({ children: [new Paragraph({ text: "Systemd services with timers, MongoDB replica set" })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Document Generation" })] }),
                new TableCell({ children: [new Paragraph({ text: "Puppeteer (headless Chrome) for PDF, graceful fallback" })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Email Delivery" })] }),
                new TableCell({ children: [new Paragraph({ text: "SMTP via EmailSender model, nodemailer" })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Scheduler" })] }),
                new TableCell({ children: [new Paragraph({ text: "Systemd timers (cron alternative)" })] }),
              ],
            }),
          ],
        });
        doc.addSection({
          children: [techTable],
        });

        // Add more content...
        new PageBreak(),
      ],
    },
  ],
});

// Save the document
const outputPath = path.join(__dirname, "..", "Salesdam_V3_Insurance_Workspace_Implementation.docx");
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outputPath, buffer);
  console.log(`Document saved to ${outputPath}`);
});