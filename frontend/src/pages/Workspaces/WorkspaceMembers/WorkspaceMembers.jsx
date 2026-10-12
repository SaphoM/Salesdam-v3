import styles from './WorkspaceMembers.module.css';
import { UserPlus, UserX } from 'lucide-react';
import Button from '../../../components/common/Button/Button';

const WorkspaceMembers = ({ members = [], onAdd, onRemove }) => {
  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.sectionTitle}>Workspace Members</span>
          <p className={styles.helper}>
            Users below are members of this workspace. A user can belong to
            multiple workspaces within the same organisation.
          </p>
        </div>

        <Button size="sm" icon={<UserPlus size={14} />} onClick={onAdd}>
          Add Member
        </Button>
      </div>

      {/* Empty */}
      {members.length === 0 ? (
        <div className={styles.empty}>
          No members yet. Add users to this workspace.
        </div>
      ) : (
        <div className={styles.memberGrid}>
          {members.map((u) => {
            const userId = u._id || u;

            const fullName = u.firstName
              ? `${u.firstName} ${u.lastName}`
              : userId;

            const email = u.email || '';

            const initials = u.firstName
              ? `${u.firstName[0]}${u.lastName?.[0] || ''}`
              : '?';

            return (
              <div key={userId} className={styles.memberCard}>
                <div className={styles.memberAvatar}>{initials}</div>

                <div className={styles.memberInfo}>
                  <span className={styles.memberName}>{fullName}</span>
                  <span className={styles.memberEmail}>{email}</span>

                  {u.systemRole && (
                    <span className={styles.memberRole}>{u.systemRole}</span>
                  )}
                </div>

                <div className={styles.memberActions}>
                  <span
                    className={`${styles.statusPill} ${
                      u.status === 'active'
                        ? styles.pillActive
                        : styles.pillInactive
                    }`}
                  >
                    {u.status || 'active'}
                  </span>

                  <button
                    className={styles.removeBtn}
                    onClick={() => onRemove(userId, fullName)}
                  >
                    <UserX size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WorkspaceMembers;
