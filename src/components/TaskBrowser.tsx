import React, { useState } from 'react';
import { MondayTask } from '@/types';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Video, Image, User, Info } from 'lucide-react';
import { isLive } from '@/lib/env';

interface TaskBrowserProps {
  tasks: MondayTask[];
  onSelectTask: (task: MondayTask) => void;
}

function highlightWords(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const words = query.trim().split(/\s+/);
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const parts = text.split(new RegExp(`(${escaped.join('|')})`, 'gi'));
  return parts.map((part, i) => {
    const isMatch = words.some((w) => part.toLowerCase() === w.toLowerCase());
    return isMatch ? (
      <mark key={i} className="bg-yellow-200 rounded-sm">
        {part}
      </mark>
    ) : (
      part
    );
  });
}

function matchesSearch(task: MondayTask, query: string): boolean {
  if (!query.trim()) return true;
  const words = query.trim().toLowerCase().split(/\s+/);
  const text =
    `${task.name} ${task.assignee ?? ''} ${task.group ?? ''} ${task.product ?? ''} ${task.type ?? ''}`.toLowerCase();
  return words.every((w) => text.includes(w));
}

export function TaskBrowser({ tasks, onSelectTask }: TaskBrowserProps) {
  const [search, setSearch] = useState('');

  const filtered = tasks.filter((t) => matchesSearch(t, search));
  const videoCount = tasks.filter((t) => t.board === 'video').length;
  const designCount = tasks.filter((t) => t.board === 'design').length;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name, product, assignee, type…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm text-muted-foreground">
          {search
            ? `${filtered.length.toLocaleString()} of ${tasks.length.toLocaleString()} tasks`
            : `${tasks.length.toLocaleString()} tasks — ${videoCount} video · ${designCount} design`}
        </span>
        {isLive && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Info className="h-3 w-3" />
            Showing 500 most recent per board · use Quick Import for any task
          </span>
        )}
      </div>

      {/* Task list */}
      <ScrollArea className="h-[580px] pr-3">
        <div className="grid gap-2">
          {filtered.map((task) => (
            <Card
              key={task.id}
              className="cursor-pointer hover:border-primary transition-colors hover:shadow-sm"
              onClick={() => onSelectTask(task)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">
                      {highlightWords(task.name, search)}
                    </p>
                    <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1.5">
                      {task.assignee && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {highlightWords(task.assignee, search)}
                        </span>
                      )}
                      {task.product && task.product !== '-' && (
                        <span className="text-xs text-muted-foreground">
                          · {highlightWords(task.product, search)}
                        </span>
                      )}
                      {task.group && (
                        <span className="text-xs text-muted-foreground">
                          · {highlightWords(task.group, search)}
                        </span>
                      )}
                    </div>
                    {task.type && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5 italic">
                        {highlightWords(task.type, search)}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge
                      variant={task.board === 'video' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {task.board === 'video' ? (
                        <span className="flex items-center gap-1">
                          <Video className="h-3 w-3" /> Video
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Image className="h-3 w-3" /> Design
                        </span>
                      )}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No tasks found</p>
              {search && (
                <p className="text-xs mt-1">
                  Try Quick Import to load a specific task by URL
                </p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
