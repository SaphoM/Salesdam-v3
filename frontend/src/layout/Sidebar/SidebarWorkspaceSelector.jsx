import { Link } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { ChevronDown, ChevronRight, Settings, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './Sidebar.module.css';

const SidebarWorkspaceSelector = ({
  workspaces,
  activeWorkspace,
  tenant,
  isAdmin,
  dropRef,
  wsDropOpen,
  setWsDropOpen,
  onSwitchWorkspace,
  switching,
  displayName,
  displaySlug,
  displayColor,
  DisplayIcon,
}) => {
  const handleSwitchWorkspace = async (ws) => {
    if (ws._id === activeWorkspace?._id) {
      setWsDropOpen(false);
      return;
    }
    try {
      await onSwitchWorkspace(ws._id);
      setWsDropOpen(false);
      toast.success(`Switched to ${ws.name}`);
    } catch (err) {
      toast.error(err.message || 'Failed to switch workspace.');
    }
  };

  return (
    <div className={styles.wsWrapper} ref={dropRef}>
      <button
        className={styles.wsBtn}
        onClick={() =>
          workspaces?.length > 0 && setWsDropOpen((o) => !o)
        }
        title={
          workspaces?.length > 1 ? 'Switch workspace' : displayName
        }
      >
        <div
          className={styles.wsAvatar}
          style={{ background: displayColor }}
        >
          {DisplayIcon ? (
            <DisplayIcon size={13} color="white" />
          ) : (
            displayName[0]?.toUpperCase()
          )}
        </div>
        <div className={styles.wsInfo}>
          <span className={styles.wsName}>{displayName}</span>
          {displaySlug && (
            <span className={styles.wsSlug}>{displaySlug}</span>
          )}
        </div>
        {workspaces?.length > 1 && (
          <span className={styles.wsChevron}>
            {wsDropOpen ? (
              <ChevronDown size={13} />
            ) : (
              <ChevronRight size={13} />
            )}
          </span>
        )}
      </button>

      {wsDropOpen && workspaces?.length > 0 && (
        <div className={styles.wsDropdown}>
          <div className={styles.wsDropdownTitle}>Workspaces</div>
          {workspaces.map((ws) => {
            const WsIcon =
              LucideIcons[ws.icon] || LucideIcons.Briefcase;
            const isActive = ws._id === activeWorkspace?._id;
            return (
              <button
                key={ws._id}
                className={`${styles.wsOption} ${isActive ? styles.wsActive : ''}`}
                onClick={() => handleSwitchWorkspace(ws)}
                disabled={switching}
              >
                <div
                  className={styles.wsOptionAvatar}
                  style={{ background: ws.color || '#0066ff' }}
                >
                  <WsIcon size={12} color="white" />
                </div>
                <span className={styles.wsOptionName}>{ws.name}</span>
                {isActive && (
                  <Check size={13} className={styles.wsCheck} />
                )}
              </button>
            );
          })}
          {isAdmin && (
            <Link
              to="/workspaces"
              className={styles.wsManageBtn}
              onClick={() => setWsDropOpen(false)}
            >
              <Settings size={11} /> Manage Workspaces
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default SidebarWorkspaceSelector;
