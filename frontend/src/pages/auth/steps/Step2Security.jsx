import styles from '../Register.module.css';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

export default function Step2Security({ form, onChange, passwordValidation, usernameErrorMessage, paystackEnabled }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className={styles.stepContent}>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>
          Username (email format) <span className={styles.required}>*</span>
        </label>
        <input
          type="email"
          name="username"
          value={form.username}
          onChange={onChange}
          className={styles.input}
          required
        />
        {usernameErrorMessage(form?.username) && (
          <span className={styles.fieldError}>{usernameErrorMessage(form?.username)}</span>
        )}
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>
          Password <span className={styles.required}>*</span>
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={form.password}
            onChange={onChange}
            className={styles.input}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {form.password && (
        <div style={{ marginBottom: '1rem' }}>
          <p
            style={{
              fontSize: '0.85rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem',
            }}
          >
            Password must contain:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {[
              { met: passwordValidation.hasMinLength, label: '8 characters minimum' },
              { met: passwordValidation.hasUpperCase, label: 'Uppercase letter (A-Z)' },
              { met: passwordValidation.hasLowerCase, label: 'Lowercase letter (a-z)' },
              { met: passwordValidation.hasNumber, label: 'Number (0-9)' },
              { met: passwordValidation.hasSpecialChar, label: 'Special character (@$!%*?&)' },
            ].map((req, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                  color: req.met ? '#10b981' : '#9ca3af',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: `2px solid ${req.met ? '#10b981' : '#d1d5db'}`,
                    textAlign: 'center',
                    lineHeight: '12px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                  }}
                >
                  {req.met ? '✓' : ''}
                </span>
                {req.label}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.fieldGroup}>
        <label className={styles.label}>
          Confirm Password <span className={styles.required}>*</span>
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={onChange}
            className={styles.input}
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {!paystackEnabled && (
        <div className={styles.fieldGroup}>
          <div className={styles.tacbox}>
            <input
              id="terms-checkbox"
              type="checkbox"
              name="terms"
              checked={form.terms}
              onChange={onChange}
            />
            <label htmlFor="terms-checkbox">
              I agree to the{' '}
              <a
                href="https://salesdam.com/terms-conditions"
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms and Conditions
              </a>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
