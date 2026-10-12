import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

/**
 * Modal Component
 *
 * A reusable modal dialog component that renders as a portal to escape stacking contexts.
 * The modal automatically closes when the user presses ESC or clicks outside the modal content.
 *
 * @component
 * @example
 * const [isOpen, setIsOpen] = useState(false);
 * return (
 *   <Modal
 *     isOpen={isOpen}
 *     onClose={() => setIsOpen(false)}
 *     title="Confirm Action"
 *     size="md"
 *   >
 *     <p>Are you sure?</p>
 *   </Modal>
 * );
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is visible. When false, the modal returns null and is not rendered.
 * @param {Function} props.onClose - Callback function triggered when the modal should close (ESC key, close button, or overlay click).
 * @param {string} props.title - The title text displayed in the modal header.
 * @param {React.ReactNode} props.children - The modal body content to display.
 * @param {string} [props.size='md'] - The modal size. One of:
 *   - 'sm' (small): 400px max-width, ideal for simple confirmations and alerts
 *   - 'md' (medium): 560px max-width, default for most dialogs and standard forms
 *   - 'lg' (large): 760px max-width, for complex forms with multiple fields
 *   - 'xl' (extra large): 960px max-width, for layouts with extensive content
 *   - 'full' (full): responsive width/height with viewport padding, for immersive experiences
 * @param {React.ReactNode} [props.footer] - Optional footer content displayed below the body (e.g., action buttons).
 *
 * @returns {React.ReactPortal|null} A portal-rendered modal dialog or null if not open.
 */
export default function Modal({ isOpen, onClose, title, children, size = 'md', footer }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape' && isOpen) onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Render via portal so the overlay is a direct child of document.body.
  // This escapes any stacking context (transform, overflow, filter) on parent
  // elements, ensuring the modal always appears above all other UI including
  // the fixed sidebar.
  return ReactDOM.createPortal(
    <div className={styles.overlay} ref={overlayRef} onClick={handleOverlayClick} role="dialog" aria-modal="true">
      <div className={`${styles.modal} ${styles[`size-${size}`]}`}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
