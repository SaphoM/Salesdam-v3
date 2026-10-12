import Layout from '../layout/Layout';
import { Link } from 'react-router-dom';
import styles from './NotFound.module.css';

export default function NotFound() {
  return (
    <Layout
      title="Page Not Found"
      description="The page you're looking for doesn't exist."
    >
      <div className={styles.container}>
        <div className={styles.content}>
          <h1 className={styles.code}>404</h1>
          <h2 className={styles.title}>Page not found</h2>
          <p className={styles.message}>
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link to="/" className={styles.homeLink}>
            Go back home
          </Link>
        </div>
      </div>
    </Layout>
  );
}
