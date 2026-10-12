import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import './Modal.css';

export default function Modal({ title, children, onClose, width = 480 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal-box" style={{ maxWidth: width }}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
