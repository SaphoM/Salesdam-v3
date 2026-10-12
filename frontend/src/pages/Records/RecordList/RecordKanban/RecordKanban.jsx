import React, { useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { GripVertical } from 'lucide-react';
import api from '../../../../services/api';
import styles from './RecordKanban.module.css';

function RecordKanban({ records, objectMeta, onRecordUpdate, fields = [] }) {
  const [draggedRecord, setDraggedRecord] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const { objectApiName } = useParams();

  // Get kanban field from object meta or provided fields array
  const kanbanField = useMemo(() => {
    if (!objectMeta?.kanbanConfig?.enabled) return null;
    const fieldApiName = objectMeta.kanbanConfig.fieldApiName;
    if (!fieldApiName) return null;
    // Try to find field in the provided fields array first (has full details with picklistValues)
    // Fall back to objectMeta.fields if not found
    return fields.find((f) => f.apiName === fieldApiName) ||
           objectMeta.fields?.find((f) => f.apiName === fieldApiName);
  }, [objectMeta, fields]);

  // Group records by kanban field value
  const groupedRecords = useMemo(() => {
    if (!kanbanField) return {};

    const grouped = {};
    (kanbanField.picklistValues || []).forEach((pv) => {
      grouped[pv.value] = [];
    });

    (records || []).forEach((record) => {
      const value = record[kanbanField.apiName];
      if (value && grouped.hasOwnProperty(value)) {
        grouped[value].push(record);
      }
    });

    return grouped;
  }, [records, kanbanField]);

  const handleDragStart = (e, record) => {
    setDraggedRecord(record);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', record._id);
  };

  const handleDragOver = (e, columnValue) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnValue);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e, columnValue) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggedRecord || !kanbanField) return;

    if (draggedRecord[kanbanField.apiName] === columnValue) {
      setDraggedRecord(null);
      return;
    }

    try {
      const recordId = draggedRecord._id || draggedRecord.id;
      // Update the record
      await api.put(`/records/${objectApiName}/${recordId}`, {
        [kanbanField.apiName]: columnValue,
      });

      toast.success(`Updated ${draggedRecord.name || draggedRecord.subject}`);
      if (onRecordUpdate) {
        onRecordUpdate();
      }
    } catch (err) {
      console.error('Update error:', err);
      toast.error(err.response?.data?.message || 'Failed to update record');
    } finally {
      setDraggedRecord(null);
    }
  };

  if (!kanbanField) {
    return (
      <div className={styles.emptyState}>
        <p>Kanban view is not configured for this object</p>
      </div>
    );
  }

  return (
    <div className={styles.kanban}>
      <div className={styles.columns}>
        {(kanbanField.picklistValues || []).map((picklistValue) => (
          <div
            key={picklistValue.value}
            className={`${styles.column} ${
              dragOverColumn === picklistValue.value ? styles.dragOver : ''
            }`}
            onDragOver={(e) => handleDragOver(e, picklistValue.value)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, picklistValue.value)}
          >
            <div className={styles.columnHeader}>
              <h3 className={styles.columnTitle}>{picklistValue.label}</h3>
              <span className={styles.columnCount}>
                {(groupedRecords[picklistValue.value] || []).length}
              </span>
            </div>

            <div className={styles.cardList}>
              {(groupedRecords[picklistValue.value] || []).map((record) => (
                <div
                  key={record._id || record.id}
                  className={`${styles.card} ${
                    draggedRecord?._id === record._id || draggedRecord?.id === record.id ? styles.dragging : ''
                  }`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, record)}
                >
                  <div className={styles.cardContent}>
                    <div className={styles.cardTitle}>
                      {record.subject || record.name || record.title}
                    </div>
                    <div className={styles.cardDescription}>
                      {record.description && record.description.substring(0, 60)}
                      {record.description && record.description.length > 60 ? '...' : ''}
                    </div>
                    <div className={styles.cardMeta}>
                      {record.assigned_to && (
                        <span className={styles.assigned}>
                          {typeof record.assigned_to === 'string'
                            ? record.assigned_to
                            : record.assigned_to.firstName}
                        </span>
                      )}
                      {record.priority && (
                        <span
                          className={`${styles.priority} ${styles[`priority${record.priority}`]}`}
                        >
                          {record.priority}
                        </span>
                      )}
                    </div>
                    {record.due_date && (
                      <div className={styles.dueDate}>
                        {new Date(record.due_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecordKanban;
