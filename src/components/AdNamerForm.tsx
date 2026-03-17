import { useState, useEffect } from 'react';
import { AdParams, INITIAL_PARAMS, MondayTask } from '@/types';
import { ENV, isLive, isReadMode } from '@/lib/env';
import * as mondayClient from '@/lib/mondayClient';
import { CREATORS } from '@/data/creators';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiSelect } from './MultiSelect';
import { CreatorSearch } from './CreatorSearch';
import { useMondayData } from '@/hooks/useMondayData';
import {
  Copy,
  Save,
  RefreshCw,
  CheckCircle,
  Loader2,
  Lock,
  X,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Video editors — pulled from the "Editor" people column on Video Projects.
 * First name is used in the generated string.
 */
const VIDEO_EDITORS = ['Isaac', 'Matan', 'Omri', 'Yael'];

/**
 * Designers — pulled from the "Designer" people column on Design Projects - 2.0.
 */
const DESIGNERS = ['Dan', 'Natalie'];

/**
 * Real product list sourced from the label9 column on both boards.
 * Kept in sync with monday.com; update here if new products are added.
 */
const PRODUCTS = [
  '-',
  'Ab Firming Cream',
  'Advanced Bundle',
  'Anti Gray Serum',
  'Body Wash',
  'Bold Moves Bundle',
  'Dark Spot Remover Set',
  'Deodorant',
  'Essential Bundle',
  'Face Cream',
  'Face Mask',
  'Face Wash',
  'Gift Bundle',
  "Golfer's Bundle",
  'Gravité',
  'Gravite Bundle',
  'Hair Gummies',
  'Hair Revival Kit',
  'Hand Cream',
  'Head Turner Set',
  'Infinite Male',
  'Instant Eye Firming Cream',
  "Lady Killer Kit",
  'Lip Balm',
  "Men's Gift Bundle",
  'Multiple Products',
  'Neck Cream',
  'Not a Product Task',
  'Power Shower Set',
  'Shampoo',
  'Shaving Gel',
  'Skin Gummies',
  'Smooth Skin Set',
  'Starter Bundle',
  'Sunscreen',
  "Ultimate Men's Gift Bundle",
  'Varros',
];

const PAGE_TYPES = [
  'PDP',
  'ElPage',
  'Collection Page',
  'Homepage',
];
const BRANDED_OPTIONS = ['Branded', 'Whitelisting'];
const ASSET_TYPES = ['Video', 'Video GIF', 'Image'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derive asset type from a task.
 * - Design board → always "Image"
 * - Video board with a GIF type label → "Video GIF"
 * - Everything else → "Video"
 */
function deriveAssetType(task: MondayTask): string {
  if (task.board === 'design') return 'Image';
  if (task.type?.toLowerCase().includes('gif')) return 'Video GIF';
  return 'Video';
}

/**
 * Extract the concept name: the text after the last pipe character in a task name.
 * e.g. "Power Shower Set | META | GIF | Easter Sale 2026" → "Easter Sale 2026"
 */
function extractConceptName(taskName: string): string {
  if (!taskName.includes('|')) return taskName;
  return taskName.split('|').pop()?.trim() ?? taskName;
}

/**
 * Normalize an assignee's full name to just the first name in title-case.
 * Handles names like "matan shapira" → "Matan" or "Isaac Yashar" → "Isaac".
 */
function normalizeFirstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? '';
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

// ─── Creator detection ────────────────────────────────────────────────────────

/**
 * Scan arbitrary text for any known creator name.
 * Longer names are tried first to avoid a short name ("Alex") shadowing a
 * more specific one ("Alex Johnson"). Returns the matched creator or null.
 */
const CREATORS_BY_LENGTH = [...CREATORS].sort((a, b) => b.length - a.length);

function findCreatorInText(text: string): string | null {
  const lower = text.toLowerCase();
  for (const creator of CREATORS_BY_LENGTH) {
    if (lower.includes(creator.toLowerCase())) return creator;
  }
  return null;
}

// ─── String builder ───────────────────────────────────────────────────────────

function buildAdString(params: AdParams): string {
  const fmt = (prefix: string, nums: number[]) => {
    if (nums.length === 0) return null;
    if (nums.length === 1) return `${prefix}${nums[0]}`;
    return `${prefix}${nums.join('/')}`;
  };

  return [
    params.product || null,
    params.conceptName || null,
    params.branded || null,
    params.assetType || null,
    fmt('V', params.versions),
    params.designerEditor || null,
    fmt('Headline V', params.headlines),
    fmt('Text V', params.texts),
    params.pageType || null,
    params.profileName || null,
    params.creator ? `Creator ${params.creator}` : null,
  ].filter(Boolean).join(' | ');
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AdNamerFormProps {
  selectedTask: MondayTask | null;
  onClearTask?: () => void;
}

type SaveStatus = 'idle' | 'saving' | 'ok' | 'error';

export function AdNamerForm({ selectedTask, onClearTask }: AdNamerFormProps) {
  const [params, setParams] = useState<AdParams>(INITIAL_PARAMS);
  const [editedString, setEditedString] = useState('');
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveMessage, setSaveMessage] = useState('');

  const { saveAdName, saveLoading } = useMondayData();

  // ── Auto-populate when a task is selected ──────────────────────────────────
  useEffect(() => {
    if (!selectedTask) return;

    const conceptName = extractConceptName(selectedTask.name);
    const assetType = deriveAssetType(selectedTask);

    // Normalize the first name so "matan shapira" → "Matan" matches the dropdown
    const assigneeFirstName = selectedTask.assignee
      ? normalizeFirstName(selectedTask.assignee)
      : '';

    // Use the product from the board column if available, fall back to empty
    const product = selectedTask.product ?? '';

    // Stage 1 — try to detect creator from task name (instant)
    const creatorFromName = findCreatorInText(selectedTask.name);

    setParams((prev) => ({
      ...prev,
      conceptName,
      assetType,
      designerEditor: assigneeFirstName,
      product,
      creator: creatorFromName ?? prev.creator,
    }));

    // Stage 2 — if no match in name and we're live, scan the task's updates
    if (!creatorFromName && isLive) {
      mondayClient.getItemUpdates(selectedTask.id).then((bodies) => {
        const combined = bodies.join(' ');
        const creatorFromUpdates = findCreatorInText(combined);
        if (creatorFromUpdates) {
          setParams((prev) => ({ ...prev, creator: creatorFromUpdates }));
        }
      }).catch(() => {/* silent — creator just stays blank */});
    }
  }, [selectedTask]);

  // ── Rebuild ad string whenever params change ───────────────────────────────
  useEffect(() => {
    setEditedString(buildAdString(params));
  }, [params]);

  const update = <K extends keyof AdParams>(key: K, value: AdParams[K]) =>
    setParams((prev) => ({ ...prev, [key]: value }));

  const designerEditorOptions = params.assetType === 'Image' ? DESIGNERS : VIDEO_EDITORS;

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleCopy = () => {
    navigator.clipboard.writeText(editedString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!selectedTask) return;

    const boardId =
      selectedTask.board === 'video' ? ENV.VIDEO_BOARD_ID : ENV.DESIGN_BOARD_ID;
    setSaveStatus('saving');
    const result = await saveAdName(selectedTask.id, boardId, editedString);
    setSaveMessage(result.message);
    setSaveStatus(result.success ? 'ok' : 'error');
    setTimeout(() => setSaveStatus('idle'), 3500);
  };

  const handleReset = () => setParams(INITIAL_PARAMS);

  // ── Save button rendering ──────────────────────────────────────────────────
  const canSaveToBoard = !!selectedTask;

  const SaveButton = () => {
    if (!canSaveToBoard) return null;

    if (isReadMode) {
      return (
        <Button size="sm" disabled title="Read-only mode is enabled (VITE_READ_MODE=true)">
          <Lock className="h-4 w-4 mr-1" /> Read-Only
        </Button>
      );
    }

    if (saveStatus === 'saving' || saveLoading) {
      return (
        <Button size="sm" disabled>
          <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving…
        </Button>
      );
    }

    if (saveStatus === 'ok') {
      return (
        <Button size="sm" variant="outline" disabled className="text-green-700 border-green-400">
          <CheckCircle className="h-4 w-4 mr-1" /> Saved!
        </Button>
      );
    }

    if (saveStatus === 'error') {
      return (
        <Button size="sm" variant="destructive" onClick={handleSave}>
          <Save className="h-4 w-4 mr-1" /> Retry
        </Button>
      );
    }

    return (
      <Button size="sm" onClick={handleSave}>
        <Save className="h-4 w-4 mr-1" /> Save to Task
      </Button>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* ── Selected-task pill ──────────────────────────────────────────────── */}
      {selectedTask && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-blue-500 uppercase tracking-wider mb-0.5">
                Selected Task
              </p>
              <p className="text-sm font-medium truncate">{selectedTask.name}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex flex-col items-end gap-1">
                <Badge variant={selectedTask.board === 'video' ? 'default' : 'secondary'}>
                  {selectedTask.board === 'video' ? 'Video' : 'Design'}
                </Badge>
                {selectedTask.type && (
                  <span className="text-xs text-muted-foreground">{selectedTask.type}</span>
                )}
              </div>
              {onClearTask && (
                <button
                  onClick={() => { handleReset(); onClearTask(); }}
                  className="rounded-full p-1 text-blue-400 hover:text-blue-700 hover:bg-blue-100 transition-colors"
                  title="Remove selected task"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Section: Content ────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-violet-500 shrink-0" />
          <p className="text-xs font-bold text-violet-600 uppercase tracking-widest">Content</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-sm font-semibold">Product</Label>
            <p className="text-xs text-muted-foreground">Which product is being advertised?</p>
            <Select value={params.product} onValueChange={(v) => update('product', v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select a product…" /></SelectTrigger>
              <SelectContent>
                {PRODUCTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-semibold">Concept Name</Label>
            <p className="text-xs text-muted-foreground">The creative angle or campaign theme</p>
            <Input
              className="mt-1"
              value={params.conceptName}
              onChange={(e) => update('conceptName', e.target.value)}
              placeholder="e.g. Easter Sale 2026"
            />
          </div>
        </div>
      </div>

      {/* ── Section: Format ─────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-orange-200 bg-orange-50/40 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />
          <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">Format</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-sm font-semibold">Asset Type</Label>
            <p className="text-xs text-muted-foreground">Video, GIF, or static image</p>
            <Select value={params.assetType} onValueChange={(v) => update('assetType', v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSET_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-semibold">Branded</Label>
            <p className="text-xs text-muted-foreground">Is the brand visible in the ad?</p>
            <Select value={params.branded} onValueChange={(v) => update('branded', v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {BRANDED_OPTIONS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-semibold">
              {params.assetType === 'Image' ? 'Designer' : 'Editor'}
            </Label>
            <p className="text-xs text-muted-foreground">
              {params.assetType === 'Image' ? 'Who designed this asset?' : 'Who edited this video?'}
            </p>
            <Select value={params.designerEditor} onValueChange={(v) => update('designerEditor', v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {designerEditorOptions.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground mt-5">Which version number(s)?</p>
            <MultiSelect
              label="Version"
              prefix="V"
              max={5}
              selected={params.versions}
              onChange={(v) => update('versions', v)}
            />
          </div>
        </div>
      </div>

      {/* ── Section: Placement ──────────────────────────────────────────────── */}
      <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-teal-500 shrink-0" />
          <p className="text-xs font-bold text-teal-600 uppercase tracking-widest">Placement</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-sm font-semibold">Page Type</Label>
            <p className="text-xs text-muted-foreground">Where does clicking the ad lead?</p>
            <Select value={params.pageType} onValueChange={(v) => update('pageType', v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select page type…" /></SelectTrigger>
              <SelectContent>
                {PAGE_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-semibold">Profile Name</Label>
            <p className="text-xs text-muted-foreground">The social account running this ad</p>
            <Input
              className="mt-1"
              value={params.profileName}
              onChange={(e) => update('profileName', e.target.value)}
              placeholder="e.g. @particleformen"
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground mt-5">Which headline variation(s)?</p>
            <MultiSelect
              label="Headline"
              prefix="H"
              max={5}
              selected={params.headlines}
              onChange={(v) => update('headlines', v)}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground mt-5">Which body text variation(s)?</p>
            <MultiSelect
              label="Text"
              prefix="T"
              max={5}
              selected={params.texts}
              onChange={(v) => update('texts', v)}
            />
          </div>
        </div>
      </div>

      {/* ── Section: Creator ────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Creator</p>
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-semibold">Creator Name</Label>
          <p className="text-xs text-muted-foreground">The UGC creator featured — auto-detected from task name or updates</p>
          <CreatorSearch
            value={params.creator}
            onChange={(v) => update('creator', v)}
          />
        </div>
      </div>

      {/* ── Output ──────────────────────────────────────────────────────────── */}
      <div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-slate-500 shrink-0" />
            <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Generated Ad Name</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-1" /> Reset
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <><CheckCircle className="h-4 w-4 mr-1 text-green-600" /> Copied</>
              ) : (
                <><Copy className="h-4 w-4 mr-1" /> Copy</>
              )}
            </Button>
            <SaveButton />
          </div>
        </div>

        <Textarea
          value={editedString}
          onChange={(e) => setEditedString(e.target.value)}
          className="font-mono text-sm bg-white border-slate-200"
          rows={3}
        />

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Edit the string above before copying or saving.
          </p>
          {saveStatus === 'error' && (
            <p className="text-xs text-destructive shrink-0">{saveMessage}</p>
          )}
          {isReadMode && canSaveToBoard && (
            <p className="text-xs text-yellow-700 flex items-center gap-1 shrink-0">
              <Lock className="h-3 w-3" /> Read-only — saves disabled
            </p>
          )}
        </div>
      </div>

    </div>
  );
}
