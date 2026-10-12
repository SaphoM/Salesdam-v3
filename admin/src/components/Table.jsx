import React from 'react';
import './Table.css';

export default function Table({ columns, rows, onRowClick, emptyMsg = 'No records found' }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table-empty">{emptyMsg}</td>
            </tr>
          ) : rows.map((row, i) => (
            <tr
              key={row._id || i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'clickable' : ''}
            >
              {columns.map((col) => (
                <td key={col.key} data-label={col.label}>
                  {col.render ? col.render(row) : row[col.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
