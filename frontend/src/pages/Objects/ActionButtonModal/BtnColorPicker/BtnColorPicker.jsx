import styles from './BtnColorPicker.module.css';
import BTN_COLOR_SWATCHES from '../utils/BTN_COLOR_SWATCHES';

const BtnColorPicker = ({ label = 'Button Color', value, onChange }) => {
  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>
        {label}
        <span className={styles.hint}>(leave empty to use variant colour)</span>
      </label>

      <div className={styles.container}>
        <div className={styles.swatchGrid}>
          {/* None option */}
          <button
            type="button"
            title="None — use variant colour"
            onClick={() => onChange('')}
            className={`${styles.swatch} ${styles.noneSwatch} ${
              !value ? styles.activeNone : ''
            }`}
          />

          {/* Preset colors */}
          {BTN_COLOR_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              onClick={() => onChange(c)}
              className={`${styles.swatch} ${value === c ? styles.active : ''}`}
              style={{ '--swatch-color': c }}
            />
          ))}
        </div>

        {/* Custom picker */}
        {/* <div className={styles.customRow}>
          <label className={styles.customLabel}>Custom:</label>

          <input
            type="color"
            value={value || '#6366f1'}
            onChange={(e) => onChange(e.target.value)}
            className={styles.colorInput}
          />

          {value && <span className={styles.value}>{value}</span>}
        </div> */}
      </div>
    </div>
  );
};

export default BtnColorPicker;
