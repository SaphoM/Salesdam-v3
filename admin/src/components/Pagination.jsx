import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './Pagination.css';

export default function Pagination({ page, totalPages, total, limit, onChange }) {
  if (totalPages <= 1) return null;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="pagination">
      <span className="pagination-info">{start}–{end} of {total}</span>
      <div className="pagination-btns">
        <button
          className="pg-btn"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={15} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce((acc, p, idx, arr) => {
            if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} className="pg-ellipsis">…</span>
            ) : (
              <button
                key={p}
                className={`pg-btn${p === page ? ' active' : ''}`}
                onClick={() => onChange(p)}
              >
                {p}
              </button>
            )
          )}
        <button
          className="pg-btn"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
