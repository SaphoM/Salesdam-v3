import React from 'react';
import './StatCard.css';

export default function StatCard({ label, value, sub, icon: Icon, color = 'accent', trend }) {
  return (
    <div className={`stat-card stat-card--${color}`}>
      <div className="stat-card__body">
        <div className="stat-card__label">{label}</div>
        <div className="stat-card__value">{value ?? '—'}</div>
        {sub && <div className="stat-card__sub">{sub}</div>}
        {trend !== undefined && (
          <div className={`stat-card__trend ${trend >= 0 ? 'up' : 'down'}`}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}
          </div>
        )}
      </div>
      {Icon && (
        <div className="stat-card__icon">
          <Icon size={22} />
        </div>
      )}
    </div>
  );
}
