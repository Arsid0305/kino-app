// FilterChip.jsx — Kino UI Kit
// Recreated from src/components/FilterSection.tsx

const FilterChip = ({ icon, label, subtitle, selected, onClick }) => (
  <button onClick={onClick}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '8px 14px', borderRadius: 12,
      border: `1px solid ${selected ? 'hsl(38 90% 55%)' : 'hsl(220 15% 18%)'}`,
      background: selected ? 'hsl(38 90% 55% / 0.15)' : 'hsl(220 15% 16%)',
      color: selected ? 'hsl(38 90% 55%)' : '#d6d0c4',
      fontSize: 13, fontWeight: 500, cursor: 'pointer',
      boxShadow: selected ? '0 0 20px -5px hsl(38 90% 55% / 0.2)' : 'none',
      transition: 'all 0.18s ease',
    }}
    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
    <span style={{ fontSize: 15 }}>{icon}</span>
    <div style={{ textAlign: 'left' }}>
      <div>{label}</div>
      {subtitle && <div style={{ fontSize: 9, color: selected ? 'hsl(38 70% 45%)' : '#787e8a', marginTop: 1 }}>{subtitle}</div>}
    </div>
  </button>
);

const FilterSection = ({ title, options, selected, onSelect }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#787e8a' }}>{title}</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
      {options.map(opt => (
        <FilterChip key={opt.value} icon={opt.icon} label={opt.label} subtitle={opt.subtitle}
          selected={selected === opt.value}
          onClick={() => onSelect(selected === opt.value ? null : opt.value)} />
      ))}
    </div>
  </div>
);

Object.assign(window, { FilterChip, FilterSection });
