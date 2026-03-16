import { useState, useRef, useEffect } from 'react';
import { CREATORS } from '@/data/creators';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CreatorSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function CreatorSearch({ value, onChange }: CreatorSearchProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.length > 0
    ? CREATORS.filter(c => c.toLowerCase().includes(query.toLowerCase())).slice(0, 10)
    : [];

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const highlightMatch = (text: string) => {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200 rounded-sm">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search or type creator name..."
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <ScrollArea className="max-h-48">
            {filtered.map(creator => (
              <button
                key={creator}
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                onMouseDown={() => {
                  onChange(creator);
                  setQuery(creator);
                  setOpen(false);
                }}
              >
                {highlightMatch(creator)}
              </button>
            ))}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
