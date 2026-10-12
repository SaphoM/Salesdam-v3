import React, { useState } from 'react';
import { X, Download, Loader } from 'lucide-react';
import styles from './PDFPreviewModal.module.css';

export default function PDFPreviewModal({ isOpen, onClose, pdfUrl, fileName = 'document' }) {
  const [loading, setLoading] = useState(true);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `${fileName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>PDF Preview</h2>
          <div className={styles.actions}>
            <button className={styles.downloadBtn} onClick={handleDownload} title="Download PDF">
              <Download size={20} />
              Download
            </button>
            <button className={styles.closeBtn} onClick={onClose} title="Close">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className={styles.content}>
          {loading && (
            <div className={styles.loadingContainer}>
              <Loader className={styles.spinner} size={40} />
              <p>Loading PDF...</p>
            </div>
          )}
          {pdfUrl && (
            <iframe
              src={pdfUrl}
              className={styles.iframe}
              title="PDF Preview"
              onLoad={() => setLoading(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
