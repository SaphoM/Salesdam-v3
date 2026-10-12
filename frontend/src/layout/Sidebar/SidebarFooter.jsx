import { LogOut } from 'lucide-react';
import styles from './Sidebar.module.css';

const SidebarFooter = ({
  user,
  sidebarCollapsed,
  onLogout,
}) => {
  return (
    <div className={styles.footer}>
      {!sidebarCollapsed && user && (
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            {user.avatar ? (
              <img src={user.avatar} alt={user.firstName} />
            ) : (
              <span>
                {user.firstName?.[0]}
                {user.lastName?.[0]}
              </span>
            )}
          </div>
          <div className={styles.userName}>
            <span className={styles.userFullName}>
              {user.firstName} {user.lastName}
            </span>
            <span className={styles.userRole}>{user.systemRole}</span>
          </div>
        </div>
      )}
      <button
        className={styles.logoutBtn}
        onClick={onLogout}
        title="Logout"
      >
        <LogOut size={16} />
        {!sidebarCollapsed && <span>Logout</span>}
      </button>
    </div>
  );
};

export default SidebarFooter;
