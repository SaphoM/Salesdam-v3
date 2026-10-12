import React, { useState, useEffect } from 'react';
import { Calendar, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import Button from '../common/Button/Button';
import Modal from '../common/Modal/Modal';
import Field from '../common/Field/Field';
import { createRecurringTasks } from '../../lib/api/recurringTasks';
import styles from './RecurringTaskModal.module.css';

const CADENCE_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
];

const DEPARTMENT_OPTIONS = [
  { value: 'hr', label: 'Human Resources' },
  { value: 'finance', label: 'Finance' },
  { value: 'sales_marketing', label: 'Sales and Marketing' },
  { value: 'procurement', label: 'Procurement' },
  { value: 'production', label: 'Production' },
  { value: 'it', label: 'IT' },
  { value: 'admin', label: 'Admin' },
  { value: 'exco', label: 'Executive' },
];

const RELATED_TO_OPTIONS = [
  { value: 'lead', label: 'Leads' },
  { value: 'deal', label: 'Deals' },
  { value: 'order', label: 'Orders' },
  { value: 'client', label: 'Clients' },
  { value: 'contact', label: 'Contacts' },
  { value: 'case', label: 'Cases' },
];

export default function RecurringTaskModal({ isOpen, onClose, onCreated }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    subject: '',
    description: '',
    department: '',
    assigned_to: user?._id || '',
    priority: 'normal',
    related_to_model: '',
    related_to_id: '',
    recurrence_cadence: 'weekly',
    recurrence_count: 4,
    recurrence_start_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (isOpen && user && !form.assigned_to) {
      setForm((prev) => ({ ...prev, assigned_to: user._id }));
    }
  }, [isOpen, user]);

  const handleSubmit = async () => {
    if (!form.subject.trim()) {
      toast.error('Subject is required');
      return;
    }

    if (!form.department) {
      toast.error('Department is required');
      return;
    }

    if (form.recurrence_count <= 0) {
      toast.error('Occurrence count must be greater than 0');
      return;
    }

    try {
      setLoading(true);
      const startDateTime = new Date(form.recurrence_start_date).toISOString();

      const result = await createRecurringTasks({
        subject: form.subject,
        description: form.description,
        department: form.department,
        assigned_to: form.assigned_to || undefined,
        priority: form.priority,
        related_to_model: form.related_to_model || undefined,
        related_to_id: form.related_to_id || undefined,
        recurrence_cadence: form.recurrence_cadence,
        recurrence_count: parseInt(form.recurrence_count, 10),
        recurrence_start_date: startDateTime,
      });

      toast.success(`Created recurring task series with ${result.taskCount} occurrences`);
      onCreated(result);

      setForm({
        subject: '',
        description: '',
        department: '',
        assigned_to: '',
        priority: 'normal',
        related_to_model: '',
        related_to_id: '',
        recurrence_cadence: 'weekly',
        recurrence_count: 4,
        recurrence_start_date: new Date().toISOString().split('T')[0],
      });

      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to create recurring task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Recurring Task"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading} onClick={handleSubmit}>
            Create Recurring Tasks
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        {/* Task Info */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Task Information</h3>

          <Field
            field={{
              apiName: 'subject',
              label: 'Subject',
              type: 'text',
              isRequired: true,
            }}
            value={form.subject}
            onChange={(apiName, value) => setForm({ ...form, [apiName]: value })}
          />

          <Field
            field={{
              apiName: 'description',
              label: 'Description',
              type: 'textarea',
              isRequired: false,
            }}
            value={form.description}
            onChange={(apiName, value) => setForm({ ...form, [apiName]: value })}
          />
        </div>

        {/* Assignment */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Assignment</h3>

          <div className={styles.row}>
            <Field
              field={{
                apiName: 'department',
                label: 'Department',
                type: 'picklist',
                isRequired: true,
                picklistValues: DEPARTMENT_OPTIONS,
              }}
              value={form.department}
              onChange={(apiName, value) => setForm({ ...form, [apiName]: value })}
            />

            <Field
              field={{
                apiName: 'assigned_to',
                label: 'Assign To',
                type: 'lookup',
                isRequired: false,
                lookupObjectApiName: 'user',
                lookupDisplayField: 'firstName',
              }}
              value={form.assigned_to}
              onChange={(apiName, value) => setForm({ ...form, [apiName]: value })}
            />
          </div>

          <div className={styles.row}>
            <Field
              field={{
                apiName: 'priority',
                label: 'Priority',
                type: 'picklist',
                isRequired: false,
                picklistValues: PRIORITY_OPTIONS,
              }}
              value={form.priority}
              onChange={(apiName, value) => setForm({ ...form, [apiName]: value })}
            />

            <Field
              field={{
                apiName: 'related_to_model',
                label: 'Related To',
                type: 'picklist',
                isRequired: false,
                picklistValues: RELATED_TO_OPTIONS,
              }}
              value={form.related_to_model}
              onChange={(apiName, value) => setForm({ ...form, [apiName]: value })}
            />
          </div>
        </div>

        {/* Recurrence */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Recurrence</h3>
            <Calendar size={16} />
          </div>

          <div className={styles.row}>
            <Field
              field={{
                apiName: 'recurrence_start_date',
                label: 'Start Date',
                type: 'date',
                isRequired: true,
              }}
              value={form.recurrence_start_date}
              onChange={(apiName, value) => setForm({ ...form, [apiName]: value })}
            />

            <Field
              field={{
                apiName: 'recurrence_cadence',
                label: 'Cadence',
                type: 'picklist',
                isRequired: true,
                picklistValues: CADENCE_OPTIONS,
              }}
              value={form.recurrence_cadence}
              onChange={(apiName, value) => setForm({ ...form, [apiName]: value })}
            />
          </div>

          <Field
            field={{
              apiName: 'recurrence_count',
              label: 'Number of Occurrences',
              type: 'number',
              isRequired: true,
              minValue: 1,
              maxValue: 365,
            }}
            value={form.recurrence_count}
            onChange={(apiName, value) => {
              const parsed = value === '' ? 1 : parseInt(value, 10);
              setForm({ ...form, [apiName]: parsed });
            }}
          />
          <p className={styles.hint}>
            {form.recurrence_cadence === 'daily' && `${form.recurrence_count} days`}
            {form.recurrence_cadence === 'weekly' && `${form.recurrence_count} weeks`}
            {form.recurrence_cadence === 'monthly' && `${form.recurrence_count} months`}
            {form.recurrence_cadence === 'yearly' && `${form.recurrence_count} years`}
          </p>

          <div className={styles.warningBox}>
            <AlertCircle size={14} />
            <div>
              <p className={styles.warningTitle}>End date will be calculated</p>
              <p className={styles.warningDesc}>
                Based on your start date, cadence, and occurrence count, the recurrence
                series will automatically end on the appropriate date.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
