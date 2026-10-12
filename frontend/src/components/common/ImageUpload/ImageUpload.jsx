import React, { useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import styles from './ImageUpload.module.css';

const ImageUpload = ({
  label,
  hint,
  value,
  onChange,
  onRemove,
  maxSize = 5 * 1024 * 1024, // 5MB default
}) => {
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      alert(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      onChange({
        file,
        preview: event.target.result,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onRemove?.();
  };

  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      {hint && <p className={styles.hint}>{hint}</p>}

      {value?.preview ? (
        <div className={styles.preview}>
          <img src={value.preview} alt="Preview" className={styles.previewImage} />
          <div className={styles.previewInfo}>
            <p className={styles.fileName}>{value.fileName || 'Image'}</p>
            <button
              type="button"
              className={styles.removeBtn}
              onClick={handleRemove}
              title="Remove image"
            >
              <X size={16} /> Remove
            </button>
          </div>
        </div>
      ) : (
        <label className={styles.uploadBox}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className={styles.fileInput}
          />
          <div className={styles.uploadContent}>
            <Upload size={24} className={styles.uploadIcon} />
            <p className={styles.uploadText}>Click to upload or drag and drop</p>
            <p className={styles.uploadHint}>PNG, JPG, GIF up to 5MB</p>
          </div>
        </label>
      )}
    </div>
  );
};

export default ImageUpload;
