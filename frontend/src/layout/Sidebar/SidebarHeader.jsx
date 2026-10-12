import { ChevronLeft, ChevronRight } from 'lucide-react';
import SidebarWorkspaceSelector from './SidebarWorkspaceSelector';
import styles from './Sidebar.module.css';

const SidebarHeader = ({
  sidebarCollapsed,
  onToggleSidebar,
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
  return (
    <div className={styles.header}>
      {!sidebarCollapsed && (
        <SidebarWorkspaceSelector
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          tenant={tenant}
          isAdmin={isAdmin}
          dropRef={dropRef}
          wsDropOpen={wsDropOpen}
          setWsDropOpen={setWsDropOpen}
          onSwitchWorkspace={onSwitchWorkspace}
          switching={switching}
          displayName={displayName}
          displaySlug={displaySlug}
          displayColor={displayColor}
          DisplayIcon={DisplayIcon}
        />
      )}

      <button
        className={styles.toggleBtn}
        onClick={onToggleSidebar}
        aria-label={
          sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
        }
      >
        {sidebarCollapsed ? (
          <ChevronRight size={16} />
        ) : (
          <ChevronLeft size={16} />
        )}
      </button>
    </div>
  );
};

export default SidebarHeader;
