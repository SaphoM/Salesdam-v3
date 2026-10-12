import { ExternalLink, Trash2, Loader } from 'lucide-react';
import styles from './UsersTable.module.css';

const UsersTable = ({ users, loading, onView, onDelete }) => {
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader className={styles.spinner} />
        <p>Loading users...</p>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <p>No users found</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Desktop Table View */}
      <div className={styles.desktopView}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Manager</th>
              <th>Status</th>
              <th>Last Login</th>
              <th style={{ width: '100px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id} className={styles.row}>
                <td>
                  <div className={styles.nameCell}>
                    <div className={styles.nameContent}>
                      <strong className={styles.userName}>
                        {user.firstName} {user.lastName}
                      </strong>
                      <span className={styles.email}>{user.email}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`${styles.badge} ${styles.roleBadge}`}>
                    {user.role?.label || user.role?.name || 'No role'}
                  </span>
                </td>
                <td>
                  <span className={styles.managerText}>
                    {user.manager
                      ? `${user.manager.firstName} ${user.manager.lastName}`
                      : '—'}
                  </span>
                </td>
                <td>
                  <span
                    className={`${styles.badge} ${styles.statusBadge} ${
                      user.status === 'active' ? styles.active : styles.inactive
                    }`}
                  >
                    {user.status}
                  </span>
                </td>
                <td>
                  <span className={styles.lastLogin}>
                    {user.lastLogin
                      ? new Date(user.lastLogin).toLocaleDateString()
                      : 'Never'}
                  </span>
                </td>
                <td>
                  <div className={styles.actionsCell}>
                    <button
                      className={styles.actionBtn}
                      onClick={() => onView(user._id)}
                      title="View"
                      aria-label="View user"
                    >
                      <ExternalLink size={16} />
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.deleteBtn}`}
                      onClick={() => onDelete(user)}
                      title="Delete"
                      aria-label="Delete user"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className={styles.mobileView}>
        {users.map((user) => (
          <div key={user._id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>
                <strong>{user.firstName} {user.lastName}</strong>
                <span
                  className={`${styles.badge} ${styles.statusBadge} ${
                    user.status === 'active' ? styles.active : styles.inactive
                  }`}
                >
                  {user.status}
                </span>
              </div>
              <div className={styles.cardActions}>
                <button
                  className={styles.cardActionBtn}
                  onClick={() => onView(user._id)}
                  title="View"
                >
                  <ExternalLink size={16} />
                </button>
                <button
                  className={`${styles.cardActionBtn} ${styles.deleteBtn}`}
                  onClick={() => onDelete(user)}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className={styles.cardContent}>
              <p className={styles.cardEmail}>{user.email}</p>

              <div className={styles.cardField}>
                <span className={styles.cardLabel}>Role</span>
                <span className={`${styles.badge} ${styles.roleBadge}`}>
                  {user.role?.label || user.role?.name || 'No role'}
                </span>
              </div>

              {user.manager && (
                <div className={styles.cardField}>
                  <span className={styles.cardLabel}>Manager</span>
                  <span className={styles.cardValue}>
                    {user.manager.firstName} {user.manager.lastName}
                  </span>
                </div>
              )}

              <div className={styles.cardField}>
                <span className={styles.cardLabel}>Last Login</span>
                <span className={styles.cardValue}>
                  {user.lastLogin
                    ? new Date(user.lastLogin).toLocaleDateString()
                    : 'Never'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UsersTable;
