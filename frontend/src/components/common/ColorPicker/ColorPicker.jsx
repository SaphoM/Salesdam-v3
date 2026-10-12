import styles from './ColorPicker.module.css';

const DEFAULT_COLORS = [
  '#6366f1',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#0ea5e9',
  '#14b8a6',
  '#f97316',
  '#ec4899',
];

const ColorPicker = ({
  label = 'Color',
  value,
  onChange,
  colors = DEFAULT_COLORS,
  size = 28,
  allowCustom = false,
  className = '',
}) => {
  const safeColors = Array.isArray(colors) ? colors : DEFAULT_COLORS;

  return (
    <div className={styles.container}>
      <label className={styles.label}>{label}</label>
      <div className={`${styles.wrapper} ${className}`}>
        <div className={styles.grid}>
          {safeColors.map((c) => {
            const isActive = value === c;

            return (
              <button
                key={c}
                type="button"
                onClick={() => onChange?.(c)}
                className={`${styles.colorBtn} ${isActive ? styles.active : ''}`}
                style={{
                  background: c,
                  width: size,
                  height: size,
                }}
              />
            );
          })}
        </div>

        {allowCustom && (
          <div className={styles.custom}>
            <input
              type="color"
              value={value || '#000000'}
              onChange={(e) => onChange?.(e.target.value)}
              className={styles.colorInput}
            />
            <input
              type="text"
              value={value || ''}
              onChange={(e) => onChange?.(e.target.value)}
              placeholder="#hex"
              className={styles.textInput}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ColorPicker;
