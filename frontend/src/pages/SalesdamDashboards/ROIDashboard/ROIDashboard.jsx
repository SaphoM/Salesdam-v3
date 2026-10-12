import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';
import api from '../../../services/api';
import useCurrency from '../../../hooks/useCurrency';
import Layout from '../../../layout/Layout';
import ChartCard from '../../../components/ChartCard/ChartCard';
import styles from './ROIDashboard.module.css';

const pageTitle = 'ROI Dashboard';
const pageDescription = 'Comprehensive analysis of sales efficiency, revenue momentum, and client performance metrics.';

const ROIDashboard = () => {
  const { symbol } = useCurrency();
  const [period, setPeriod] = useState('all-time');
  const [sortBy, setSortBy] = useState('volume');
  const [leadSource, setLeadSource] = useState('');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  const { data, isLoading } = useQuery({
    queryFn: async () => {
      try {
        const params = {
          period,
          sortBy,
        };
        if (leadSource) {
          params.leadSource = leadSource;
        }
        if (period === 'custom' && customRange.start && customRange.end) {
          params.customStart = customRange.start;
          params.customEnd = customRange.end;
        }

        const response = await api.get('/analytics/roi-dashboard', { params });
        return response.data?.data || [];
      } catch (error) {
        console.error('Error fetching ROI data:', error);
        return [];
      }
    },
    queryKey: ['roi-dashboard', period, sortBy, leadSource, customRange],
    staleTime: 1000 * 60 * 5,
  });

  const formatZAR = (val) => {
    if (!val) return `${symbol}0`;
    if (val >= 1_000_000) return `${symbol}${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${symbol}${(val / 1_000).toFixed(0)}K`;
    return `${symbol}${Number(val).toLocaleString('en-ZA')}`;
  };

  const truncateLabel = (label, max = 24) => {
    const text = String(label || 'Unnamed Client').trim();
    return text.length > max ? `${text.slice(0, max - 1)}ÔÇª` : text;
  };

  const topClients = (data || []).slice(0, 10);

  const hitRatioData = topClients.map((c) => ({
    name: truncateLabel(c.clientName),
    value: Math.round(c.hitRatio * 100),
  }));

  const valueRatioData = topClients.map((c) => ({
    name: truncateLabel(c.clientName),
    value: Math.round(c.valueRatio * 100),
  }));

  const renderMetricValue = (client) => {
    if (sortBy === 'value') {
      return formatZAR(client.totalOrderValue);
    }
    return `${client.receivedOrders} Order${client.receivedOrders !== 1 ? 's' : ''}`;
  };

  const renderMetricHeader = () => {
    return sortBy === 'value' ? 'Total Revenue' : 'Total Orders';
  };

  const SkeletonRow = () => (
    <div className={styles.skeletonRow}>
      <div className={styles.skeletonCell} style={{ width: '8%' }} />
      <div className={styles.skeletonCell} style={{ width: '25%' }} />
      <div className={styles.skeletonCell} style={{ width: '12%' }} />
      <div className={styles.skeletonCell} style={{ width: '12%' }} />
      <div className={styles.skeletonCell} style={{ width: '20%' }} />
    </div>
  );

  const ChartSkeleton = () => (
    <div className={styles.chartSkeleton}>
      <div className={styles.skeletonBars}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className={styles.skeletonBar} />
        ))}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Layout title={pageTitle} description={pageDescription}>
        <div className={styles.headerContainer}>
          <div>
            <h1 className={styles.pageTitle}>{pageTitle}</h1>
            <p className={styles.pageDescription}>{pageDescription}</p>
          </div>

          <div className={styles.filterWrapper}>
            <div className={styles.controlsRow}>
              <div className={styles.filterContainer}>
                <label className={styles.filterLabel}>Source:</label>
                <select className={styles.selectFilter} disabled>
                  <option>All Sources</option>
                </select>
              </div>
              <div className={styles.filterContainer}>
                <label className={styles.filterLabel}>Rank By:</label>
                <select className={styles.selectFilter} disabled>
                  <option>Orders (Volume)</option>
                </select>
              </div>
              <div className={styles.filterContainer}>
                <label className={styles.filterLabel}>Period:</label>
                <select className={styles.selectFilter} disabled>
                  <option>All Time</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.divider}>
          <div className={styles.card}>
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
          <div className={styles.accountingdash}>
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={pageTitle} description={pageDescription}>
      <div className={styles.headerContainer}>
        <div style={{ flex: 1 }}>
          <h1 className={styles.pageTitle}>{pageTitle}</h1>
          <p className={styles.pageDescription}>{pageDescription}</p>
        </div>

        <div className={styles.filterWrapper}>
          <div className={styles.controlsRow}>
            <div className={styles.filterContainer}>
              <label className={styles.filterLabel}>Source:</label>
              <select
                className={styles.selectFilter}
                value={leadSource}
                onChange={(e) => setLeadSource(e.target.value)}
              >
                <option value="">All Sources</option>
                <option value="Email">Email</option>
                <option value="Phone">Phone</option>
                <option value="Website">Website</option>
                <option value="Referral">Referral</option>
                <option value="Cold Call">Cold Call</option>
              </select>
            </div>

            <div className={styles.filterContainer}>
              <label className={styles.filterLabel}>Rank By:</label>
              <select
                className={styles.selectFilter}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="volume">Orders (Volume)</option>
                <option value="value">Rand Value (Revenue)</option>
              </select>
            </div>

            <div className={styles.filterContainer}>
              <label className={styles.filterLabel}>Period:</label>
              <select
                className={styles.selectFilter}
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="all-time">All Time</option>
                <option value="this-month">This Month</option>
                <option value="last-3-months">Last 3 Months</option>
                <option value="this-year">Fiscal Year to Date</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
          </div>

          {period === 'custom' && (
            <div className={styles.customDateContainer}>
              <input
                type="date"
                className={styles.dateInput}
                value={customRange.start}
                onChange={(e) => setCustomRange((p) => ({ ...p, start: e.target.value }))}
              />
              <span className={styles.toText}>to</span>
              <input
                type="date"
                className={styles.dateInput}
                value={customRange.end}
                onChange={(e) => setCustomRange((p) => ({ ...p, end: e.target.value }))}
              />
            </div>
          )}
        </div>
      </div>

      <div className={styles.divider}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            ­ƒÅå Top 5 Clients (by {sortBy === 'volume' ? 'Volume' : 'Revenue'})
          </h3>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Client</th>
                  <th>Hit Ratio</th>
                  <th>Value Ratio</th>
                  <th>{renderMetricHeader()}</th>
                </tr>
              </thead>
              <tbody>
                {(data || []).slice(0, 5).map((client, i) => (
                  <tr key={i}>
                    <td>
                      <span className={styles.rankBadge}>{i + 1}</span>
                    </td>
                    <td className={styles.clientName}>{client.clientName}</td>
                    <td>{Math.round(client.hitRatio * 100)}%</td>
                    <td>{Math.round(client.valueRatio * 100)}%</td>
                    <td className={styles.bold}>{renderMetricValue(client)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.accountingdash}>
          <ChartCard icon={BarChart3} title="Hit Ratio (%)">
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={hitRatioData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="value" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard icon={BarChart3} title="Value Ratio (%)">
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={valueRatioData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="value" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Detailed Client Performance Summary</h3>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Deals</th>
                  <th>Orders</th>
                  <th>Total Deal Value</th>
                  <th>Total Order Value</th>
                  <th className={styles.highlightHeader}>{renderMetricHeader()}</th>
                </tr>
              </thead>
              <tbody>
                {(data || []).map((c, i) => (
                  <tr key={i}>
                    <td className={styles.clientName}>{c.clientName}</td>
                    <td>{c.submittedDeals}</td>
                    <td>{c.receivedOrders}</td>
                    <td>{formatZAR(c.totalDealValue)}</td>
                    <td>{formatZAR(c.totalOrderValue)}</td>
                    <td className={styles.bold}>{renderMetricValue(c)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ROIDashboard;
