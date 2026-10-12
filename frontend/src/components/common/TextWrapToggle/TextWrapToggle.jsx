import styles from './TextWrapToggle.module.css';
import { AlignLeft, WrapText } from 'lucide-react';
import { CLIP, WRAP } from '../../../hooks/useTextWrap';

/**
 * Segmented control for how table cells handle overlong text: clip it to one
 * line with an ellipsis, or wrap it onto more lines.
 */
const TextWrapToggle = ({ value, onChange, className = '' }) => (
  <div className={`${styles.toggle} ${className}`} role="group">
    <button
      type="button"
      className={`${styles.btn} ${value === CLIP ? styles.active : ''}`}
      onClick={() => onChange(CLIP)}
      title="Clip text — keep every row one line high"
      aria-pressed={value === CLIP}
    >
      <AlignLeft size={16} />
    </button>
    <button
      type="button"
      className={`${styles.btn} ${value === WRAP ? styles.active : ''}`}
      onClick={() => onChange(WRAP)}
      title="Wrap text — show the full value over several lines"
      aria-pressed={value === WRAP}
    >
      <WrapText size={16} />
    </button>
  </div>
);

export default TextWrapToggle;
