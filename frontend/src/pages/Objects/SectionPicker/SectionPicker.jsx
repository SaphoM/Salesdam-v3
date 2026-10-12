import styles from './SectionPicker.module.css';
import React, { useState } from 'react';

/**
 * SectionPicker — dropdown of existing sections + ability to type a new one.
 * Shows a list of existing section names; selecting "New section…" reveals a text input.
 */
const SectionPicker = ({ value, onChange, existingSections }) => {
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const inputRef = React.useRef(null);

  /// Only use existing sections (no defaults)
  const allSections = [...new Set(existingSections)];

  React.useEffect(() => {
    if (creatingNew) setTimeout(() => inputRef.current?.focus(), 50);
  }, [creatingNew]);

  const handleSelectChange = (e) => {
    const v = e.target.value;
    if (v === '__new__') {
      setCreatingNew(true);
      setNewName('');
    } else {
      setCreatingNew(false);
      onChange(v);
    }
  };

  const commitNew = () => {
    const trimmed = newName.trim();
    if (trimmed) {
      onChange(trimmed);
      setCreatingNew(false);
    }
  };

  if (creatingNew) {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          ref={inputRef}
          className={styles.input}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New section name…"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitNew();
            }
            if (e.key === 'Escape') {
              setCreatingNew(false);
            }
          }}
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className={styles.sectionConfirmBtn}
          onClick={commitNew}
          disabled={!newName.trim()}
        >
          Add
        </button>
        <button
          type="button"
          className={styles.sectionCancelBtn}
          onClick={() => setCreatingNew(false)}
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <select
      className={styles.select}
      value={value || 'Information'}
      onChange={handleSelectChange}
    >
      {allSections.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
      {/* Show current value if it's not in the list (custom from a previous save) */}
      {value && !allSections.includes(value) && (
        <option value={value}>{value}</option>
      )}
      <option value="__new__">＋ New section…</option>
    </select>
  );
};

export default SectionPicker;
