import styles from './TableSkeleton.module.css';

function Bone({ width = '100%', style, variant }) {
  return (
    <span
      className={[styles.bone, variant ? styles[variant] : ''].join(' ').trim()}
      style={{ width: variant ? undefined : width, ...style }}
    />
  );
}

const COLUMNS = [
  { width: '32px', variant: 'round' },
  { width: '40%' },
  { width: '22%' },
  { width: '18%', variant: 'badge' },
  { width: '14%' },
];

export default function TableSkeleton({
  rows = 6,
  columns = COLUMNS,
  showHeader = true,
  showFooter = true,
}) {
  return (
    <div className={styles.wrapper}>
      {showHeader && (
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Bone width="160px" style={{ height: '18px' }} />
            <Bone width="100px" style={{ height: '12px' }} />
          </div>
          <div className={styles.headerRight}>
            <Bone
              width="88px"
              style={{ height: '34px', borderRadius: 'var(--border-radius)' }}
            />
            <Bone
              width="88px"
              style={{ height: '34px', borderRadius: 'var(--border-radius)' }}
            />
          </div>
        </div>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              {columns.map((col, i) => (
                <th key={i} className={styles.th}>
                  <Bone
                    width={col.variant === 'round' ? '32px' : '60%'}
                    style={{ height: '12px' }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <tr key={rowIdx} className={styles.tr}>
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className={styles.td}>
                    <Bone
                      width={col.width}
                      variant={col.variant}
                      style={
                        col.variant
                          ? undefined
                          : {
                              width: `${Math.max(40, parseInt(col.width) - (rowIdx % 3) * 8)}%`,
                            }
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showFooter && (
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            <Bone width="120px" style={{ height: '12px' }} />
          </div>
          <div className={styles.footerRight}>
            <Bone
              width="28px"
              style={{
                height: '28px',
                borderRadius: 'var(--border-radius-sm)',
              }}
            />
            <Bone
              width="28px"
              style={{
                height: '28px',
                borderRadius: 'var(--border-radius-sm)',
              }}
            />
            <Bone
              width="28px"
              style={{
                height: '28px',
                borderRadius: 'var(--border-radius-sm)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
