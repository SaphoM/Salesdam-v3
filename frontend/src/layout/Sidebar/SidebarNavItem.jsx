import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';

const hexToChipBg = (hex) => {
  if (!hex || !hex.startsWith('#')) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.12)`;
};

const SidebarNavItem = ({
  to,
  icon,
  label,
  collapsed,
  badge,
  iconColor,
  onNavigate,
  dataTour,
}) => {
  const chipBg = iconColor ? hexToChipBg(iconColor) : null;

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${styles.navItem} ${isActive ? styles.active : ''}`
      }
      title={collapsed ? label : undefined}
      onClick={onNavigate}
      data-tour={dataTour}
    >
      <span
        className={`${styles.navIcon} ${chipBg ? styles.navIconChip : ''}`}
        style={chipBg ? { color: iconColor, background: chipBg } : undefined}
      >
        {icon}
      </span>
      {!collapsed && <span className={styles.navLabel}>{label}</span>}
      {!collapsed && badge && <span className={styles.badge}>{badge}</span>}
    </NavLink>
  );
};

export default SidebarNavItem;
