import React from 'react';
import styles from './FormInput.module.css';

const FormInput = ({
  label,
  value,
  onChange,
  error,
  disabled,
  required,
  type = 'text',
  placeholder,
  className,
  name,
  icon,
  id,
  ...rest
}) => {
  return (
    <div className={[styles.fieldGroup, className].filter(Boolean).join(' ')}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={styles.inputWrapper}>
        <input
          id={id}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className={[styles.input, error ? styles.error : ''].filter(Boolean).join(' ')}
          {...rest}
        />
        {icon && <div className={styles.icon}>{icon}</div>}
      </div>
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
};

export default FormInput;
