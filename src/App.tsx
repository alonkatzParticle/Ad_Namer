import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { TaskBrowser } from '@/components/TaskBrowser';
import { AdNamerForm } from '@/components/AdNamerForm';
import { QuickImport } from '@/components/QuickImport';
import { useMondayData } from '@/hooks/useMondayData';
import { MondayTask } from '@/types';
import { isLive, isReadMode, hasBoardIds } from '@/lib/env';
import {
  Layers,
  LayoutGrid,
  Wand2,
  Lock,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function App() {
  const { allTasks, tasksLoading, error, usingMockData, refetch } = useMondayData();
  const [selectedTask, setSelectedTask] = useState<MondayTask | null>(null);
  const [activeTab, setActiveTab] = useState('form');

  const handleSelectTask = (task: MondayTask) => {
    setSelectedTask(task);
    setActiveTab('form');
  };

  const handleClearTask = () => setSelectedTask(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                <Wand2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Ad Namer</h1>
            </div>
            <p className="text-muted-foreground text-sm pl-12">
              Generate standardized ad naming conventions from monday.com tasks
            </p>
          </div>

          {/* Connection badge */}
          <div className="flex items-center gap-2 mt-1">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 border border-green-200">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Live — monday.com
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-200">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                Mock data
              </span>
            )}
            {isReadMode && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-700 border border-yellow-200">
                <Lock className="h-3 w-3" />
                Read-Only
              </span>
            )}
          </div>
        </div>

        {/* ── Status banners ───────────────────────────────────────────────── */}

        {/* READ_MODE banner */}
        {isReadMode && (
          <Alert variant="warning">
            <Lock className="h-4 w-4" />
            <AlertTitle>Read-Only Mode</AlertTitle>
            <AlertDescription>
              <code className="font-mono text-xs">VITE_READ_MODE=true</code> is set.
              The app will not write anything to monday.com.
              All form fields work normally — only the "Save to Task" action is disabled.
            </AlertDescription>
          </Alert>
        )}


        {/* API key present but board IDs missing */}
        {!hasBoardIds && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Board IDs not configured</AlertTitle>
            <AlertDescription>
              Set <code className="font-mono text-xs">VITE_VIDEO_BOARD_ID</code> and{' '}
              <code className="font-mono text-xs">VITE_DESIGN_BOARD_ID</code> in your{' '}
              <code className="font-mono text-xs">.env</code> file to load board tasks.
            </AlertDescription>
          </Alert>
        )}

        {/* API fetch error */}
        {error && usingMockData && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Could not load board data</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>{error} — showing mock data as fallback.</span>
              <Button
                size="sm"
                variant="outline"
                onClick={refetch}
                className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                <RefreshCw className="h-3 w-3 mr-1" /> Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* ── Quick Import ─────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Quick Import
            </CardTitle>
            <CardDescription className="text-xs">
              Paste a monday.com task link to instantly pre-fill the generator
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <QuickImport onImport={handleSelectTask} />
          </CardContent>
        </Card>

        {/* ── Main Tabs ────────────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="form" className="flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              Generator
            </TabsTrigger>
            <TabsTrigger value="browse" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Browse Tasks
              {tasksLoading ? (
                <Loader2 className="ml-1 h-3 w-3 animate-spin" />
              ) : (
                <span className="ml-1 rounded-full bg-muted-foreground/20 px-1.5 py-0.5 text-xs">
                  {allTasks.length.toLocaleString()}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="form">
            <Card>
              <CardHeader>
                <CardTitle>Ad Name Generator</CardTitle>
                <CardDescription>
                  Fill in the fields below to generate a standardized ad naming string
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdNamerForm selectedTask={selectedTask} onClearTask={handleClearTask} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="browse">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Browse Tasks</CardTitle>
                    <CardDescription>
                      Search across Video Projects and Design Projects boards.
                      Click a task to load it in the generator.
                    </CardDescription>
                  </div>
                  {isLive && (
                    <Button variant="ghost" size="sm" onClick={refetch} disabled={tasksLoading}>
                      {tasksLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Loading tasks from monday.com…</span>
                  </div>
                ) : (
                  <TaskBrowser tasks={allTasks} onSelectTask={handleSelectTask} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
