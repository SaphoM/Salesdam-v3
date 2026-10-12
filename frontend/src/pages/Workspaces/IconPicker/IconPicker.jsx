import * as LucideIcons from 'lucide-react';

const LUCIDE_ICONS = [
  'Briefcase',
  'Building2',
  'Users',
  'Star',
  'Zap',
  'Globe',
  'Layers',
  'Settings',
  'Database',
  'BarChart2',
  'Target',
  'Flag',
  'Shield',
  'Heart',
  'Box',
  'Package',
  'Cpu',
  'Code2',
  'Mail',
  'Phone',
];

const IconPicker = ({ value, onChange, color }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
    {LUCIDE_ICONS.map((name) => {
      const Icon = LucideIcons[name] || LucideIcons.Box;
      const sel = value === name;
      return (
        <button
          key={name}
          type="button"
          title={name}
          onClick={() => onChange(name)}
          style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `${sel ? 2 : 1}px solid ${sel ? color : 'var(--border-color)'}`,
            borderRadius: 'var(--border-radius)',
            background: sel ? `${color}20` : 'var(--color-white)',
            color: sel ? color : 'var(--color-gray-500)',
            cursor: 'pointer',
          }}
        >
          <Icon size={14} />
        </button>
      );
    })}
  </div>
);

export default IconPicker;
