import {
  BarChart2,
  Package,
  Building2,
  TrendingUp,
  UserPlus,
  DollarSign,
  Target,
  Activity,
} from 'lucide-react';
import SidebarNavItem from './SidebarNavItem';
import SidebarNavGroup from './SidebarNavGroup';

const SidebarDashboards = ({
  tenantFeatures,
  sidebarCollapsed,
}) => {
  const hasDashboards =
    tenantFeatures.enableSalesdamFeatures &&
    (tenantFeatures.salesdamOrdersDashboard ||
      tenantFeatures.salesdamAccountDashboard ||
      tenantFeatures.salesdamDealsDashboard ||
      tenantFeatures.salesdamLeadsDashboard ||
      tenantFeatures.salesdamRevenueDashboard ||
      tenantFeatures.salesdamSalesDashboard ||
      tenantFeatures.salesdamROIDashboard);

  if (!hasDashboards) {
    return null;
  }

  return (
    <SidebarNavGroup
      label="Dashboards"
      icon={<BarChart2 size={18} />}
      collapsed={sidebarCollapsed}
    >
      {tenantFeatures.salesdamOrdersDashboard && (
        <SidebarNavItem
          to="/sd/orders"
          icon={<Package size={16} />}
          label="Orders Dashboard"
          collapsed={sidebarCollapsed}
        />
      )}
      {tenantFeatures.salesdamAccountDashboard && (
        <SidebarNavItem
          to="/sd/accounting"
          icon={<Building2 size={16} />}
          label="Accounting Dashboard"
          collapsed={sidebarCollapsed}
        />
      )}
      {tenantFeatures.salesdamDealsDashboard && (
        <SidebarNavItem
          to="/sd/deals"
          icon={<TrendingUp size={16} />}
          label="Deals Dashboard"
          collapsed={sidebarCollapsed}
        />
      )}
      {tenantFeatures.salesdamLeadsDashboard && (
        <SidebarNavItem
          to="/sd/leads"
          icon={<UserPlus size={16} />}
          label="Leads Dashboard"
          collapsed={sidebarCollapsed}
        />
      )}
      {tenantFeatures.salesdamRevenueDashboard && (
        <SidebarNavItem
          to="/sd/revenue"
          icon={<DollarSign size={16} />}
          label="Revenue Targets"
          collapsed={sidebarCollapsed}
        />
      )}
      {tenantFeatures.salesdamSalesDashboard && (
        <SidebarNavItem
          to="/sd/sales"
          icon={<Target size={16} />}
          label="Sales Targets"
          collapsed={sidebarCollapsed}
        />
      )}
      {tenantFeatures.salesdamROIDashboard && (
        <SidebarNavItem
          to="/sd/roi"
          icon={<Activity size={16} />}
          label="ROI Dashboard"
          collapsed={sidebarCollapsed}
        />
      )}
    </SidebarNavGroup>
  );
};

export default SidebarDashboards;
