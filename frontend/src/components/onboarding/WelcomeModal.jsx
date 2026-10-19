import { Database, LayoutDashboard, Zap, Users, Sparkles } from 'lucide-react';
import { useOnboarding } from './OnboardingProvider';
import styles from './Onboarding.module.css';

const BENEFITS = [
  {
    icon: <Database size={16} />,
    title: 'Model your data',
    body: 'Create objects and fields that fit your business, with no code.',
  },
  {
    icon: <LayoutDashboard size={16} />,
    title: 'See the numbers',
    body: 'Dashboards, analytics and sales targets in one place.',
  },
  {
    icon: <Zap size={16} />,
    title: 'Automate the busywork',
    body: 'Flows, approvals and tasks that keep work moving.',
  },
  {
    icon: <Users size={16} />,
    title: 'Work as a team',
    body: 'Workspaces, permissions and a shared customer inbox.',
  },
];

const WelcomeModal = () => {
  const { welcomeOpen, startTour, exploreOnMyOwn } = useOnboarding();

  if (!welcomeOpen) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-welcome-title"
    >
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.mark}>
            <Sparkles size={22} />
          </div>
          <h2 id="onboarding-welcome-title" className={styles.title}>
            Welcome to Salesdam
          </h2>
          <p className={styles.subtitle}>
            Your workspace is set up. Here&rsquo;s what you can do with it.
          </p>
        </div>

        <ul className={styles.benefits}>
          {BENEFITS.map(({ icon, title, body }) => (
            <li key={title} className={styles.benefit}>
              <span className={styles.benefitIcon}>{icon}</span>
              <span className={styles.benefitText}>
                <strong>{title}</strong>
                <span>{body}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={exploreOnMyOwn}
          >
            Explore on my own
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={startTour}
          >
            Let&rsquo;s get started
          </button>
        </div>

        <p className={styles.footnote}>
          Guided tour &middot; about a minute
        </p>
      </div>
    </div>
  );
};

export default WelcomeModal;
