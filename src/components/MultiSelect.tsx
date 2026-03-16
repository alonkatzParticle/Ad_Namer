import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface MultiSelectProps {
  label: string;
  prefix: string;
  max: number;
  selected: number[];
  onChange: (values: number[]) => void;
}

export function MultiSelect({ label, prefix, max, selected, onChange }: MultiSelectProps) {
  const toggle = (n: number) => {
    if (selected.includes(n)) {
      onChange(selected.filter(v => v !== n));
    } else {
      onChange([...selected, n].sort((a, b) => a - b));
    }
  };

  const format = () => {
    if (selected.length === 0) return `—`;
    if (selected.length === 1) return `${prefix}${selected[0]}`;
    return `${prefix}${selected.join('/')}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {selected.length > 0 && (
          <Badge variant="secondary" className="text-xs font-mono">
            {format()}
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: max }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            onClick={() => toggle(n)}
            className={cn(
              "h-8 w-8 rounded-md text-xs font-medium border transition-colors",
              selected.includes(n)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-accent border-input"
            )}
          >
            {n}
          </button>
        ))}
        {selected.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="h-8 px-2 rounded-md text-xs border border-input hover:bg-accent flex items-center gap-1 text-muted-foreground"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>
    </div>
  );
}
