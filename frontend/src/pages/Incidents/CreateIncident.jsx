import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { createIncident } from '../../services/api/incidents';
import Button from '../../components/common/Button/Button';
import Layout from '../../layout/Layout';
import styles from './CreateIncident.module.css';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: '#16a34a' },
  { value: 'medium', label: 'Medium', color: '#eab308' },
  { value: 'high', label: 'High', color: '#ea580c' },
  { value: 'critical', label: 'Critical', color: '#dc2626' },
];

export default function CreateIncident() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    attachments: [],
  });
  const [imagePreview, setImagePreview] = useState(null);

  const mutation = useMutation({
    mutationFn: (data) => createIncident(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Incident created successfully');
      navigate(`/incidents/${res.data.data._id}`);
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to create incident');
    },
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      setImagePreview(base64);
      setFormData((prev) => ({
        ...prev,
        attachments: [
          {
            fileName: file.name,
            fileType: file.type,
            data: base64,
          },
        ],
      }));
      toast.success('Image added successfully');
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    setFormData((prev) => ({
      ...prev,
      attachments: [],
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Please enter an incident title');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Please enter a detailed description');
      return;
    }

    mutation.mutate(formData);
  };

  return (
    <Layout title="Report New Incident">
      <div className={styles.container}>
        <button onClick={() => navigate('/incidents')} className={styles.backButton}>
          <ArrowLeft size={18} />
          Back to Incidents
        </button>

        <div className={styles.formContainer}>
          <div className={styles.header}>
            <h1 className={styles.title}>Report an Issue</h1>
            <p className={styles.subtitle}>
              Help us improve by reporting any issues you encounter
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Title */}
            <div className={styles.formGroup}>
              <label htmlFor="title" className={styles.label}>
                Issue Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Briefly describe the issue"
                className={styles.input}
                maxLength={200}
                disabled={mutation.isPending}
              />
              <p className={styles.charCount}>
                {formData.title.length}/200
              </p>
            </div>

            {/* Description */}
            <div className={styles.formGroup}>
              <label htmlFor="description" className={styles.label}>
                Description
              </label>
              <p className={styles.hint}>
                Include details about what happened, what you expected, and any steps to reproduce
              </p>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Provide detailed information about the issue..."
                className={styles.textarea}
                rows={8}
                disabled={mutation.isPending}
              />
            </div>

            {/* Priority */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Priority Level</label>
              <div className={styles.priorityGrid}>
                {PRIORITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        priority: option.value,
                      }))
                    }
                    disabled={mutation.isPending}
                    className={`${styles.priorityOption} ${
                      formData.priority === option.value ? styles.selected : ''
                    }`}
                    style={{
                      borderColor:
                        formData.priority === option.value ? option.color : undefined,
                      backgroundColor:
                        formData.priority === option.value
                          ? `${option.color}20`
                          : undefined,
                    }}
                  >
                    <div
                      className={styles.priorityColor}
                      style={{ backgroundColor: option.color }}
                    />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Image Upload */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Add Screenshot or Image</label>
              <p className={styles.hint}>Upload an image to help illustrate the issue (max 5MB)</p>

              {imagePreview ? (
                <div className={styles.imagePreview}>
                  <img src={imagePreview} alt="Preview" className={styles.previewImage} />
                  <button
                    type="button"
                    onClick={removeImage}
                    disabled={mutation.isPending}
                    className={styles.removeImageButton}
                    title="Remove image"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={mutation.isPending}
                  className={styles.uploadButton}
                >
                  <Upload size={24} />
                  <span>Click to upload or drag and drop</span>
                  <span className={styles.uploadHint}>PNG, JPG, GIF up to 5MB</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className={styles.hiddenFileInput}
                disabled={mutation.isPending}
              />
            </div>

            {/* Actions */}
            <div className={styles.formActions}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/incidents')}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending || !formData.title.trim() || !formData.description.trim()}
                loading={mutation.isPending}
              >
                Submit Issue
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
