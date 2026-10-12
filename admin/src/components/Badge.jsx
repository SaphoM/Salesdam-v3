import React from 'react';

const colors = {
  active:    { bg: 'var(--green-soft)',  color: 'var(--green)' },
  suspended: { bg: 'var(--yellow-soft)', color: 'var(--yellow)' },
  deleted:   { bg: 'var(--red-soft)',    color: 'var(--red)' },
  inactive:  { bg: 'var(--bg3)',         color: 'var(--text3)' },
  pending:   { bg: 'var(--yellow-soft)', color: 'var(--yellow)' },
  free:      { bg: 'var(--bg3)',         color: 'var(--text2)' },
  starter:   { bg: 'var(--blue-soft)',   color: 'var(--blue)' },
  basic:     { bg: 'var(--accent-soft)', color: 'var(--accent)' },
  standard:  { bg: 'var(--accent-soft)', color: 'var(--accent)' },
  enterprise:{ bg: 'var(--yellow-soft)', color: 'var(--yellow)' },
  superuser: { bg: 'var(--red-soft)',    color: 'var(--red)' },
  admin:     { bg: 'var(--accent-soft)', color: 'var(--accent)' },
  user:      { bg: 'var(--bg3)',         color: 'var(--text2)' },
};

export default function Badge({ value, label }) {
  const key = (value || '').toLowerCase();
  const style = colors[key] || { bg: 'var(--bg3)', color: 'var(--text2)' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '99px',
        fontSize: '11px',
        fontWeight: 600,
        background: style.bg,
        color: style.color,
        whiteSpace: 'nowrap',
        textTransform: 'capitalize',
      }}
    >
      {label || value}
    </span>
  );
}
