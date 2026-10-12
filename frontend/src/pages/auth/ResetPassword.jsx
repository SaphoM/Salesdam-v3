import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AlertCircle, CheckCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import Button from '../../components/common/Button/Button';
import FormInput from '../../components/common/FormInput/FormInput';
import styles from './Login.module.css';
import api from '../../services/api';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('Invalid password reset link. Missing token.');
        setValidating(false);
        return;
      }

      try {
        await api.post('/auth/verify-reset-token', { token });
        setTokenValid(true);
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            'Invalid or expired password reset link. Please request a new one.',
        );
      } finally {
        setValidating(false);
      }
    };

    verifyToken();
  }, [token]);

  const validatePassword = (pwd) => {
    const hasUpperCase = /[A-Z]/.test(pwd);
    const hasLowerCase = /[a-z]/.test(pwd);
    const hasNumber = /\d/.test(pwd);
    const hasSpecialChar = /[@$!%*?&]/.test(pwd);
    const hasMinLength = pwd.length >= 8;

    return {
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      hasSpecialChar,
      hasMinLength,
      isValid:
        hasUpperCase &&
        hasLowerCase &&
        hasNumber &&
        hasSpecialChar &&
        hasMinLength,
    };
  };

  const passwordValidation = validatePassword(formData.password);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.password) {
      setError('Please enter a new password');
      return;
    }

    if (!passwordValidation.isValid) {
      setError('Password does not meet all requirements');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: formData.password,
      });
      setSubmitted(true);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          'Failed to reset password. Please try again.',
      );
      setIsSubmitting(false);
    }
  };

  if (validating) {
    return (
      <>
        <Helmet>
          <title>Reset Password | Salesdam</title>
        </Helmet>
        <div className={styles.container}>
          <div className={styles.rightPanel}>
            <div className={styles.formContainer}>
              <div className={styles.formHeader}>
                <img src="/icon.png" alt="Salesdam" className={styles.avatar} />
                <h2 className={styles.formTitle}>Validating Link...</h2>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!token || !tokenValid) {
    return (
      <>
        <Helmet>
          <title>Invalid Link | Salesdam</title>
        </Helmet>
        <div className={styles.container}>
          <div className={styles.leftPanel}>
            <div className={styles.welcomeContent}>
              <div className={styles.brandSection}>
                <div className={styles.logoText}>Salesdam</div>
                <h1 className={styles.title}>Password Reset</h1>
              </div>
            </div>
          </div>

          <div className={styles.rightPanel}>
            <div className={styles.formContainer}>
              <div className={styles.formHeader}>
                <img src="/icon.png" alt="Salesdam" className={styles.avatar} />
                <h2 className={styles.formTitle}>Link Expired</h2>
              </div>

              <div
                style={{
                  marginTop: '2rem',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '1rem',
                  }}
                >
                  <AlertCircle size={48} style={{ color: '#ef4444' }} />
                </div>
                <div
                  style={{
                    backgroundColor: '#fee2e2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ color: '#991b1b', marginBottom: '0.5rem' }}>
                    <strong>Invalid or expired link</strong>
                  </p>
                  <p style={{ color: '#b91c1c', fontSize: '0.9rem' }}>
                    {error ||
                      'This password reset link has expired. Please request a new one.'}
                  </p>
                </div>

                <Link
                  to="/forgot-password"
                  style={{
                    display: 'inline-block',
                    backgroundColor: 'var(--color-primary, #007bff)',
                    color: 'white',
                    padding: '0.85rem 2rem',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: '500',
                    marginBottom: '1rem',
                  }}
                >
                  Request New Link
                </Link>
                <br />
                <Link
                  to="/login"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--color-primary, #007bff)',
                    textDecoration: 'none',
                    fontSize: '0.95rem',
                  }}
                >
                  <ArrowLeft size={16} />
                  Back to Login
                </Link>
              </div>
            </div>

            <footer className={styles.copyright}>
              &copy; {new Date().getFullYear()} Salesdam. All rights reserved.
            </footer>
          </div>
        </div>
      </>
    );
  }

  if (submitted) {
    return (
      <>
        <Helmet>
          <title>Password Reset Successful | Salesdam</title>
        </Helmet>
        <div className={styles.container}>
          <div className={styles.leftPanel}>
            <div className={styles.welcomeContent}>
              <div className={styles.brandSection}>
                <div className={styles.logoText}>Salesdam</div>
                <h1 className={styles.title}>Password Reset</h1>
              </div>
            </div>
          </div>

          <div className={styles.rightPanel}>
            <div className={styles.formContainer}>
              <div className={styles.formHeader}>
                <img src="/icon.png" alt="Salesdam" className={styles.avatar} />
                <h2 className={styles.formTitle}>Password Updated</h2>
              </div>

              <div
                style={{
                  marginTop: '2rem',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '1rem',
                  }}
                >
                  <CheckCircle size={48} style={{ color: '#10b981' }} />
                </div>
                <div
                  style={{
                    backgroundColor: '#ecfdf5',
                    border: '1px solid #d1fae5',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ color: '#065f46', marginBottom: '0.5rem' }}>
                    <strong>Password reset successfully!</strong>
                  </p>
                  <p style={{ color: '#047857', fontSize: '0.9rem' }}>
                    Your password has been updated. You can now log in with your
                    new password.
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate('/login')}
                  style={{ marginBottom: '1rem' }}
                >
                  Go to Login
                </Button>
              </div>
            </div>

            <footer className={styles.copyright}>
              &copy; {new Date().getFullYear()} Salesdam. All rights reserved.
            </footer>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Reset Password | Salesdam</title>
        <meta name="description" content="Create a new password for your Salesdam account" />
      </Helmet>

      <div className={styles.container}>
        <div className={styles.leftPanel}>
          <div className={styles.welcomeContent}>
            <div className={styles.brandSection}>
              <div className={styles.logoText}>Salesdam</div>
              <h1 className={styles.title}>Set a New Password</h1>
              <p className={styles.description}>
                Create a strong password to secure your Salesdam account.
              </p>
              <Link
                className={styles.learnMoreBtn}
                to="https://www.salesdam.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>

        <div className={styles.rightPanel}>
          <div className={styles.formContainer}>
            <div className={styles.formHeader}>
              <img src="/icon.png" alt="Salesdam" className={styles.avatar} />
              <h2 className={styles.formTitle}>Create New Password</h2>
              <p className={styles.formSubtitle}>
                Enter a strong password to secure your account
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className={styles.form}>
              <FormInput
                id="password"
                label="New Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter new password"
                autoComplete="new-password"
                icon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#666',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />

              {formData.password && (
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

              <FormInput
                id="confirmPassword"
                label="Confirm Password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                autoComplete="new-password"
                icon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#666',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                    }}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                }
              />

              {error && (
                <div className={styles.errorMessage}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={isSubmitting || !passwordValidation.isValid}
              >
                {isSubmitting ? 'Resetting...' : 'Reset Password'}
              </Button>

              <div className={styles.formFooter}>
                <Link
                  to="/login"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--color-primary, #007bff)',
                    textDecoration: 'none',
                    fontSize: '0.95rem',
                  }}
                >
                  <ArrowLeft size={16} />
                  Back to Login
                </Link>
              </div>
            </form>
          </div>

          <footer className={styles.copyright}>
            &copy; {new Date().getFullYear()} Salesdam. All rights reserved.
          </footer>
        </div>
      </div>
    </>
  );
};

export default ResetPassword;
