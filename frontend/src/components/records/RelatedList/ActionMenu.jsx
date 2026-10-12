import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { MoreVertical, Edit2, Trash2 } from 'lucide-react';
import styles from './ActionMenu.module.css';

export default function ActionMenu({ onEdit, onDelete, canEdit, canDelete }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handleClickOutside = (e) => {
      // Check if click is outside both trigger and dropdown
      const isOutsideTrigger = triggerRef.current && !triggerRef.current.contains(e.target);
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(e.target);

      if (isOutsideTrigger && isOutsideDropdown) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
    }

    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX - 80,
      });
    }
  }, [isOpen]);

  const handleEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(false);
    onEdit();
  };

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(false);
    onDelete();
  };

  if (!canEdit && !canDelete) return null;

  const dropdown = isOpen && ReactDOM.createPortal(
    <div
      ref={dropdownRef}
      className={styles.dropdown}
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {canEdit && (
        <button className={styles.item} onClick={handleEdit}>
          <Edit2 size={14} />
          <span>Edit</span>
        </button>
      )}
      {canDelete && (
        <button className={`${styles.item} ${styles.danger}`} onClick={handleDelete}>
          <Trash2 size={14} />
          <span>Delete</span>
        </button>
      )}
    </div>,
    document.body
  );

  return (
    <>
      <button
        ref={triggerRef}
        className={styles.trigger}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title="Actions"
      >
        <MoreVertical size={14} />
      </button>
      {dropdown}
    </>
  );
}
