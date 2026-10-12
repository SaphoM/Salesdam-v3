import { Children, isValidElement, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import styles from './Sidebar.module.css';
import { getGroupOpen, setGroupOpen } from './navGroupState';

/** Collects the `to` path of every descendant nav item. */
const collectPaths = (nodes) =>
  Children.toArray(nodes).flatMap((child) => {
    if (!isValidElement(child)) return [];
    const own = typeof child.props?.to === 'string' ? [child.props.to] : [];
    return [...own, ...collectPaths(child.props?.children)];
  });

const SidebarNavGroup = ({
  label,
  icon,
  children,
  collapsed,
  defaultOpen = false,
}) => {
  const { pathname } = useLocation();

  // Initialised from the persisted preference so clicking a nav item — which
  // remounts the sidebar — doesn't collapse the accordion. When the group has
  // no stored preference yet, open it if it contains the current route.
  const [open, setOpen] = useState(() => {
    const containsActive = collectPaths(children).some(
      (path) =>
        path === pathname || (path !== '/' && pathname.startsWith(`${path}/`)),
    );
    return getGroupOpen(label, defaultOpen || containsActive);
  });

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      setGroupOpen(label, next);
      return next;
    });
  };

  if (collapsed) {
    return <div className={styles.navGroup}>{children}</div>;
  }

  return (
    <div className={styles.navGroup}>
      <button
        className={styles.navGroupToggle}
        onClick={toggle}
        aria-expanded={open}
      >
        <span className={styles.navGroupIcon}>{icon}</span>
        <span className={styles.navLabel}>{label}</span>
        <span className={styles.navArrow}>
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
      </button>
      {open && <div className={styles.navGroupChildren}>{children}</div>}
    </div>
  );
};

export default SidebarNavGroup;
