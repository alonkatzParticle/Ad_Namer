import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MondayTask } from '@/types';
import { useMondayData } from '@/hooks/useMondayData';
import { Link, Check, AlertCircle, Loader2 } from 'lucide-react';

interface QuickImportProps {
  onImport: (task: MondayTask) => void;
}

type Status = 'idle' | 'loading' | 'found' | 'not-found';

export function QuickImport({ onImport }: QuickImportProps) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const { findTaskByUrl } = useMondayData();

  const handleImport = async () => {
    if (!url.trim()) return;
    setStatus('loading');
    try {
      const task = await findTaskByUrl(url.trim());
      if (task) {
        onImport(task);
        setStatus('found');
        setUrl('');
      } else {
        setStatus('not-found');
      }
    } catch {
      setStatus('not-found');
    }
    setTimeout(() => setStatus('idle'), 2500);
  };

  return (
    <div className="flex gap-2 items-center">
      <div className="relative flex-1">
        <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Paste monday.com task URL…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleImport()}
          disabled={status === 'loading'}
        />
      </div>

      <Button
        onClick={handleImport}
        disabled={!url.trim() || status === 'loading'}
        size="sm"
      >
        {status === 'loading' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          'Import'
        )}
      </Button>

      {status === 'found' && (
        <span className="flex items-center gap-1 text-sm text-green-600 whitespace-nowrap">
          <Check className="h-4 w-4" /> Imported!
        </span>
      )}
      {status === 'not-found' && (
        <span className="flex items-center gap-1 text-sm text-destructive whitespace-nowrap">
          <AlertCircle className="h-4 w-4" /> Not found
        </span>
      )}
    </div>
  );
}
