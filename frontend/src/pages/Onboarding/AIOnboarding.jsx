import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import styles from './AIOnboarding.module.css';

const INDUSTRIES = [
  'Technology',
  'Finance',
  'Healthcare',
  'Real Estate',
  'Retail',
  'Manufacturing',
  'Education',
  'Consulting',
  'Legal',
  'Marketing',
  'Other',
];
const USE_CASES = [
  'Sales CRM',
  'Customer Support',
  'Real Estate Management',
  'Lead Management',
  'Project Management',
  'HR Management',
  'Other',
];

export default function AIOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [industry, setIndustry] = useState('');
  const [useCase, setUseCase] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      await api.post('/ai/onboarding', { industry, useCase });
      setDone(true);
      setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      toast.error(
        err.message ||
          'AI onboarding failed. You can configure your workspace manually.',
      );
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <CheckCircle size={64} className={styles.successIcon} />
          <h1 className={styles.title}>Workspace Ready!</h1>
          <p className={styles.subtitle}>
            Your AI-powered workspace is being set up. Redirecting in a
            moment...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon}>
          <Zap size={32} />
        </div>
        <h1 className={styles.title}>Let AI set up your workspace</h1>
        <p className={styles.subtitle}>
          Tell us about your business and we'll create the perfect CRM structure
          for you.
        </p>

        {step === 0 && (
          <div className={styles.stepContent}>
            <h3 className={styles.stepTitle}>What industry are you in?</h3>
            <div className={styles.optionGrid}>
              {INDUSTRIES.map((i) => (
                <button
                  key={i}
                  className={`${styles.option} ${industry === i.toLowerCase().replace(' ', '_') ? styles.selected : ''}`}
                  onClick={() => setIndustry(i.toLowerCase().replace(' ', '_'))}
                >
                  {i}
                </button>
              ))}
            </div>
            <button
              className={styles.nextBtn}
              disabled={!industry}
              onClick={() => setStep(1)}
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
        )}

        {step === 1 && (
          <div className={styles.stepContent}>
            <h3 className={styles.stepTitle}>What will you use it for?</h3>
            <div className={styles.optionGrid}>
              {USE_CASES.map((u) => (
                <button
                  key={u}
                  className={`${styles.option} ${useCase === u.toLowerCase().replace(' ', '_') ? styles.selected : ''}`}
                  onClick={() => setUseCase(u.toLowerCase().replace(' ', '_'))}
                >
                  {u}
                </button>
              ))}
            </div>
            <div className={styles.btnRow}>
              <button className={styles.backBtn} onClick={() => setStep(0)}>
                Back
              </button>
              <button
                className={styles.nextBtn}
                disabled={!useCase}
                onClick={handleStart}
              >
                {loading ? (
                  <>
                    <span className={styles.spinner} /> Setting up...
                  </>
                ) : (
                  <>
                    Build My Workspace <Zap size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <button className={styles.skipBtn} onClick={() => navigate('/')}>
          Skip — I'll set it up manually
        </button>
      </div>
    </div>
  );
}
