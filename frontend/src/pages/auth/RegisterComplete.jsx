import styles from './Register.module.css';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import Field from '../../components/ui/field/Field';
import Button from '../../components/ui/button/Button';
import { toast, ToastContainer } from 'react-toastify';
import { register, getVerificationStatus } from '../../lib/api/authentication';
import { getPublicPlans } from '../../lib/api/billing';
import {
  MailCheck,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  CreditCard,
} from 'lucide-react';

const MARKETPLACE_URL =
  'https://marketplace.microsoft.com/sr-latn-rs/product/saas/digitalfingerprint_2017.digitalfingerprint-saas-platform?tab=overview';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidEmailFormat = (value) => EMAIL_REGEX.test(value || '');

const trackPixel = (eventName, params = {}, { standard = false } = {}) => {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq(standard ? 'track' : 'trackCustom', eventName, params);
  }
};

const Register = () => {
  const [searchParams] = useSearchParams();
  const [registrationMethod, setRegistrationMethod] = useState(null); // null | 'paystack'
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    companyName: '',
    employees: '',
    password: '',
    confirmPassword: '',
    planId: '',
    debitOrderDay: 1,
    terms: false,
  });

  // Tracks whether the user has manually typed their own username;
  // if not, username stays synced to whatever email is entered.
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);

  useEffect(() => {
    const firstName = searchParams.get('firstName');
    const lastName = searchParams.get('lastName');
    const username = searchParams.get('username');
    const email = searchParams.get('email');

    setForm((prevForm) => ({
      ...prevForm,
      firstName: firstName || prevForm.firstName,
      lastName: lastName || prevForm.lastName,
      username: username || email || prevForm.username,
      email: email || prevForm.email,
    }));

    // If a username arrived via URL params, treat it as manually set
    // so we don't silently overwrite it if email also changes later.
    if (username) {
      setUsernameManuallyEdited(true);
    }
  }, [searchParams]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPromptToCheckEmail, setShowPromptToCheckEmail] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [checkingVerification, setCheckingVerification] = useState(false);

  const { data: plans = [], isLoading: isPlansLoading } = useQuery({
    queryKey: ['active-plans'],
    queryFn: getPublicPlans,
    enabled: registrationMethod === 'paystack',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    if (name === 'username') {
      // Once the user types their own username, stop auto-syncing it to email
      setUsernameManuallyEdited(true);
      setForm((prev) => ({ ...prev, username: newValue }));
      return;
    }

    if (name === 'email') {
      setForm((prev) => ({
        ...prev,
        email: newValue,
        // Keep username mirrored to email until the user overrides it themselves
        username: usernameManuallyEdited ? prev.username : newValue,
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: newValue }));
  };

  const handleNext = () => {
    setMessage('');

    if (step === 1) {
      if (
        !form.firstName ||
        !form.lastName ||
        !form.email ||
        !form.phone ||
        !form.companyName
      ) {
        setMessage('Please fill in all required fields');
        return;
      }

      if (!isValidEmailFormat(form.email)) {
        setMessage('Please enter a valid email address');
        return;
      }
    }

    if (step === 2) {
      if (!form.username || !form.password || !form.confirmPassword) {
        setMessage('Please fill in all required fields');
        return;
      }

      if (!isValidEmailFormat(form.username)) {
        setMessage('Username must be a valid email address');
        return;
      }

      if (form.password !== form.confirmPassword) {
        setMessage('Passwords do not match');
        return;
      }
    }

    trackPixel('RegistrationStepCompleted', { step, method: 'paystack' });
    setStep(step + 1);
  };

  const handleBack = () => {
    setMessage('');
    if (step === 1) {
      setRegistrationMethod(null);
    } else {
      setStep(step - 1);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    if (!isValidEmailFormat(form.username)) {
      setMessage('Username must be a valid email address');
      setLoading(false);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage('Passwords do not match');
      setLoading(false);
      return;
    }

    if (!form.terms) {
      setMessage('Please agree to the terms and conditions');
      setLoading(false);
      return;
    }

    if (!form.planId) {
      setMessage('Please select a plan');
      setLoading(false);
      return;
    }

    if (!form.debitOrderDay) {
      setMessage('Please select your debit order day');
      setLoading(false);
      return;
    }

    try {
      const response = await registerWithPaystack(form);
      trackPixel(
        'CompleteRegistration',
        { method: 'paystack' },
        { standard: true },
      );
      setShowPromptToCheckEmail(true);

      if (response?.data?.checkoutUrl) {
        setCheckoutUrl(response.data.checkoutUrl);
      }
    } catch (error) {
      const msg = error?.response?.data?.message;
      toast.error(msg || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRedirectToCheckout = async () => {
    setCheckingVerification(true);
    try {
      const response = await getVerificationStatus(form.email);
      console.log('Verification status response:', response);

      if (response?.data?.isVerified && response?.data?.checkoutUrl) {
        window.location.href = response.data.checkoutUrl;
      } else if (response?.data?.isVerified && !response?.data?.checkoutUrl) {
        toast.error(
          'Verified, but no checkout link was found. Please contact support.',
        );
      } else {
        toast.error(
          "You haven't verified your email yet. Please check your inbox first.",
        );
      }
    } catch (error) {
      const msg = error?.response?.data?.message;
      toast.error(
        msg || 'Unable to check verification status. Please try again.',
      );
    } finally {
      setCheckingVerification(false);
    }
  };

  if (isPlansLoading && registrationMethod === 'paystack') {
    return (
      <div className={styles['spinner-container']}>
        <div className={styles['spinner']}></div>
        <p>Loading Registration form...</p>
      </div>
    );
  }

  if (showPromptToCheckEmail) {
    return (
      <div className={styles.promptContainer}>
        <ToastContainer
          position="top-center"
          autoClose={3000}
          theme="colored"
        />
        <div className={styles.promptCard}>
          <MailCheck size={60} color="var(--color-primary)" />
          <h2 className={styles.promptTitle}>Check Your Email</h2>
          <p className={styles.promptText}>
            We've sent a verification link to <strong>{form.email}</strong>.
            Please check your inbox and click the link to verify your account.
          </p>
          <p className={styles.promptSubtext}>
            Didn't receive the email? Check your spam folder or request another
            one.
          </p>

          {checkoutUrl && (
            <div className={styles.promptButtons}>
              <Button
                size="lg"
                variant="primary"
                onClick={handleRedirectToCheckout}
                disabled={checkingVerification}
                className={styles.promptButtonPrimary}
              >
                {checkingVerification
                  ? 'Checking...'
                  : "I've verified my email — Continue to Checkout"}
              </Button>

              <Button
                size="lg"
                variant="secondary"
                onClick={() => (window.location.href = '/login')}
                className={styles.promptButtonSecondary}
              >
                Go to Login
              </Button>
            </div>
          )}

          {!checkoutUrl && (
            <Button
              size="lg"
              variant="secondary"
              onClick={() => (window.location.href = '/login')}
              className={styles.promptButton}
            >
              Go to Login
            </Button>
          )}
        </div>
      </div>
    );
  }

  const usernameErrorMessage = (username) => {
    if (username && !isValidEmailFormat(username)) {
      return 'Username must be a valid email address';
    }
  };

  // Method selection screen
  if (registrationMethod === null) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={`${styles.card} ${styles.methodCard}`}>
            <h1 className={styles.title}>Create Your Account</h1>
            <p className={styles.subtitle}>
              Choose how you'd like to register for Salesdam
            </p>

            <div className={styles.methodGrid}>
              <a
                href={MARKETPLACE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.methodOption}
                onClick={() =>
                  trackPixel('RegistrationMethodSelected', {
                    method: 'microsoft_marketplace',
                  })
                }
              >
                <div className={styles.methodIconWrap} data-variant="microsoft">
                  <svg width="32" height="32" viewBox="0 0 23 23" fill="none">
                    <rect x="1" y="1" width="10" height="10" fill="#F25022" />
                    <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
                    <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
                    <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
                  </svg>
                </div>
                <div className={styles.methodInfo}>
                  <h3>Microsoft Marketplace</h3>
                  <p>
                    Subscribe through the Microsoft Azure Marketplace. Billing
                    is managed by Microsoft.
                  </p>
                </div>
                <ExternalLink size={18} className={styles.methodArrow} />
              </a>

              <button
                className={styles.methodOption}
                onClick={() => {
                  trackPixel('RegistrationMethodSelected', {
                    method: 'paystack',
                  });
                  setRegistrationMethod('paystack');
                }}
                type="button"
              >
                <div className={styles.methodIconWrap} data-variant="paystack">
                  <CreditCard size={28} />
                </div>
                <div className={styles.methodInfo}>
                  <h3>Direct Registration</h3>
                  <p>
                    Register directly and pay with your card via Paystack.
                    Choose your own billing date.
                  </p>
                </div>
                <ChevronRight size={18} className={styles.methodArrow} />
              </button>
            </div>

            <p className={styles.methodFooterText}>
              Already have an account?{' '}
              <Link to="/login" className={styles.methodLoginLink}>
                Sign in
              </Link>
            </p>
          </div>

          <footer className={styles.footer}>
            © {new Date().getFullYear()} Salesdam. All rights reserved.
          </footer>
        </div>
      </div>
    );
  }

  // Paystack registration wizard (steps 1-3)
  return (
    <div className={styles.wrapper}>
      <ToastContainer position="top-center" autoClose={3000} theme="colored" />
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.stepIndicator}>
            <div
              className={`${styles.stepDot} ${step >= 1 ? styles.active : ''}`}
            >
              1
            </div>
            <div className={styles.stepLine}></div>
            <div
              className={`${styles.stepDot} ${step >= 2 ? styles.active : ''}`}
            >
              2
            </div>
            <div className={styles.stepLine}></div>
            <div
              className={`${styles.stepDot} ${step >= 3 ? styles.active : ''}`}
            >
              3
            </div>
          </div>

          <h1 className={styles.title}>
            {step === 1 && 'Create Your Account'}
            {step === 2 && 'Secure Your Account'}
            {step === 3 && 'Choose Your Plan'}
          </h1>
          <p className={styles.subtitle}>
            {step === 1 && "Let's start with your basic information"}
            {step === 2 && 'Set up a strong password to protect your account'}
            {step === 3 && 'Select the perfect plan for your business'}
          </p>

          <form
            onSubmit={step === 3 ? handleRegister : (e) => e.preventDefault()}
            className={styles.form}
          >
            {step === 1 && (
              <div className={styles.stepContent}>
                <div className={styles.row}>
                  <Field
                    label="First Name"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                  />
                  <Field
                    label="Last Name"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <Field
                  label="Email Address"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
                <Field
                  label="Phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  required
                />
                <Field
                  label="Company Name"
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            {step === 2 && (
              <div className={styles.stepContent}>
                <Field
                  label="Username (email format)"
                  name="username"
                  type="email"
                  value={form.username}
                  onChange={handleChange}
                  errorMessage={usernameErrorMessage(form?.username)}
                  required
                />
                <Field
                  label="Password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
                <Field
                  label="Confirm Password"
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <div className={styles.passwordHint}>
                  <p>Password should be strong and secure</p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className={styles.stepContent}>
                <Field
                  label="Number of Employees"
                  name="employees"
                  type="number"
                  value={form.employees}
                  onChange={handleChange}
                  required
                  min="1"
                />

                <div className={styles.planSection}>
                  <h3 className={styles.planTitle}>Choose Your Plan</h3>
                  <div className={styles.planOptions}>
                    {plans?.map((plan) => (
                      <label
                        key={plan?._id}
                        className={`${styles.planCard} ${
                          form?.planId === plan?._id ? styles.selected : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="planId"
                          value={plan?._id}
                          checked={form?.planId === plan?._id}
                          onChange={handleChange}
                        />
                        <div>
                          <h4>{plan?.name}</h4>
                          <span className={styles.planPrice}>
                            {`R${plan?.amount}/mo per user`}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className={styles.debitOrderSection}>
                  <label className={styles.debitOrderLabel}>
                    Debit Order Day
                  </label>
                  <p className={styles.debitOrderHint}>
                    Choose the day of the month your subscription will be
                    debited (1–28).
                  </p>
                  <div className={styles.debitOrderGrid}>
                    {[1, 5, 10, 15, 20, 25, 28].map((day) => (
                      <button
                        key={day}
                        type="button"
                        className={`${styles.debitDayBtn} ${
                          Number(form.debitOrderDay) === day
                            ? styles.debitDaySelected
                            : ''
                        }`}
                        onClick={() =>
                          setForm((prev) => ({ ...prev, debitOrderDay: day }))
                        }
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  <div className={styles.debitOrderCustom}>
                    <span>Or enter a custom day:</span>
                    <input
                      type="number"
                      name="debitOrderDay"
                      value={form.debitOrderDay}
                      onChange={handleChange}
                      min="1"
                      max="28"
                      className={styles.debitOrderInput}
                    />
                  </div>
                </div>

                <div className={styles.tacbox}>
                  <input
                    id="checkbox"
                    type="checkbox"
                    name="terms"
                    checked={form.terms}
                    onChange={handleChange}
                    required
                  />
                  <label htmlFor="checkbox">
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

            {message && <div className={styles.message}>{message}</div>}

            <div className={styles.buttonGroup}>
              <Button
                size="lg"
                variant="secondary"
                onClick={handleBack}
                className={styles.backButton}
                type="button"
              >
                <ChevronLeft size={18} />
                Back
              </Button>

              {step < 3 ? (
                <Button
                  size="lg"
                  variant="primary"
                  onClick={handleNext}
                  className={styles.nextButton}
                  type="button"
                >
                  Next
                  <ChevronRight size={18} />
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="primary"
                  type="submit"
                  disabled={loading}
                  className={styles.submitButton}
                >
                  {loading ? 'Processing...' : 'Complete Registration'}
                </Button>
              )}
            </div>
          </form>
        </div>

        <footer className={styles.footer}>
          © {new Date().getFullYear()} Salesdam. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default Register;
