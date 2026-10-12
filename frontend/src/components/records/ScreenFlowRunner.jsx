/**
 * ScreenFlowRunner
 *
 * Renders an embedded screen_flow automation as an interactive wizard.
 * Used when a flow is drag-dropped onto a record layout section or
 * shown as a tab on the record detail page.
 *
 * Props:
 *   automationId  — ID of the screen_flow Automation document
 *   record        — current record data (flat object)
 *   fields        — FieldMeta array for this object
 *   objectApiName — string
 */
import React from 'react';
import { AlertCircle } from 'lucide-react';
import FlowWizard from './FlowWizard';
import styles from './ScreenFlowRunner.module.css';

export default function ScreenFlowRunner({
  automationId,
  record,
  fields,
  objectApiName,
}) {
  if (!automationId) {
    return (
      <div className={styles.error}>
        <AlertCircle size={16} /> No automation ID provided.
      </div>
    );
  }

  return (
    <FlowWizard
      automationId={automationId}
      record={record}
      fields={fields || []}
      objectApiName={objectApiName || record?.objectApiName || ''}
      onDone={() => {}}
    />
  );
}
