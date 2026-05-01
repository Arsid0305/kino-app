import { motion } from 'framer-motion';

interface FilterChipProps {
  icon: string;
  label: string;
  subtitle?: string;
  selected: boolean;
  onClick: () => void;
}

const FilterChip = ({ icon, label, subtitle, selected, onClick }: FilterChipProps) => (
  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 text-sm font-medium
      ${selected 
        ? 'bg-primary/15 border-primary text-primary cinema-glow' 
        : 'bg-secondary border-border text-secondary-foreground hover:border-muted-foreground/40'
      }`}
  >
    <span className="text-base">{icon}</span>
    <div className="text-left">
      <div>{label}</div>
      {subtitle && <div className="text-[10px] text-muted-foreground">{subtitle}</div>}
    </div>
  </motion.button>
);

interface FilterSectionProps {
  title: string;
  options: { value: string; label: string; icon: string; subtitle?: string }[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  cols?: number;
}

export const FilterSection = ({ title, options, selected, onSelect, cols }: FilterSectionProps) => (
  <div className="space-y-2.5">
    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</h3>
    <div className={cols ? `grid gap-2` : 'flex flex-wrap gap-2'} style={cols ? { gridTemplateColumns: `repeat(${cols}, 1fr)` } : undefined}>
      {options.map(opt => (
        <FilterChip
          key={opt.value}
          icon={opt.icon}
          label={opt.label}
          subtitle={opt.subtitle}
          selected={selected === opt.value}
          onClick={() => onSelect(selected === opt.value ? null : opt.value)}
        />
      ))}
    </div>
  </div>
);
