import { useState, useEffect, useCallback } from 'react';
import { MondayTask } from '@/types';
import {
  ENV,
  isLive,
  isReadMode,
  hasBoardIds,
  VIDEO_COLUMN_IDS,
  DESIGN_COLUMN_IDS,
} from '@/lib/env';
import * as mondayClient from '@/lib/mondayClient';

// ─── Mock fallback data ───────────────────────────────────────────────────────
// Realistic data that mirrors what the real boards return.

const MOCK_VIDEO_TASKS: MondayTask[] = [
  { id: '11517018115', name: 'Lip Balm | Amazon | A+ Videos', board: 'video', assignee: 'Isaac Yashar', group: 'Active', type: 'Script - Short Form (<20 seconds)', product: 'Lip Balm' },
  { id: '11171434010', name: 'Face Cream | META | ADGE | You Look Different (Hook v2)', board: 'video', assignee: 'Isaac Yashar', group: 'Active', type: 'Iterations/Cuts/Edits', product: 'Face Cream' },
  { id: '11361983929', name: 'Power Shower Set | META | GIF | Easter Sale 2026 Videos', board: 'video', assignee: undefined, group: 'Active', type: 'GIF - Existing Static', product: 'Power Shower Set' },
  { id: '11361988220', name: 'Ultimate Men\'s Gift Bundle | META | GIF | Easter Sale 2026', board: 'video', assignee: undefined, group: 'Active', type: 'GIF - Existing Static', product: "Ultimate Men's Gift Bundle" },
  { id: '1003', name: 'Anti Gray Serum | Meta | Direct Before & After Hook', board: 'video', assignee: 'matan shapira', group: 'Active', type: 'UGC/Creator', product: 'Anti Gray Serum' },
  { id: '1004', name: 'Hair Gummies | Meta | Transformation Story', board: 'video', assignee: 'matan shapira', group: 'Active', type: 'UGC/Creator', product: 'Hair Gummies' },
  { id: '1005', name: 'Shampoo | META | GIF | Product Showcase', board: 'video', assignee: undefined, group: 'Review', type: 'GIF - New Static', product: 'Shampoo' },
  { id: '1006', name: 'Body Wash | META | Lifestyle Hook', board: 'video', assignee: 'Isaac Yashar', group: 'Active', type: 'Script (<1 min)', product: 'Body Wash' },
  { id: '1007', name: 'Gravité | Meta | Luxe Feel Skincare Routine', board: 'video', assignee: 'Yael Ben-Dor', group: 'Active', type: 'Motion Design', product: 'Gravité' },
  { id: '1008', name: 'Face Wash | TV | Spanish Translation', board: 'video', assignee: 'Isaac Yashar', group: 'Active', type: 'Translation', product: 'Face Wash' },
];

const MOCK_DESIGN_TASKS: MondayTask[] = [
  { id: '11458778464', name: 'Hair Revival Kit | Website | Other | 3D Modules', board: 'design', assignee: 'Natalie Abesdid', group: 'In Progress', type: 'Website', product: 'Hair Revival Kit' },
  { id: '11458782822', name: 'Advanced Bundle | Website | Other | 3D Modules', board: 'design', assignee: 'Natalie Abesdid', group: 'In Progress', type: 'Website', product: 'Advanced Bundle' },
  { id: '2003', name: 'Power Shower Set | Socials | Summer Sale Banner', board: 'design', assignee: 'Dan Lowenstein', group: 'Review', type: 'Socials', product: 'Power Shower Set' },
  { id: '2004', name: 'Face Cream | Email | Newsletter Hero Image', board: 'design', assignee: 'Natalie Abesdid', group: 'In Progress', type: 'Marketing', product: 'Face Cream' },
  { id: '2005', name: 'Anti Gray Serum | Amazon | A+ Content Modules', board: 'design', assignee: 'Dan Lowenstein', group: 'In Progress', type: 'Amazon', product: 'Anti Gray Serum' },
  { id: '2006', name: 'Gravité | Socials | GIF Design | Product Reveal', board: 'design', assignee: 'Natalie Abesdid', group: 'In Progress', type: 'GIF Design', product: 'Gravité' },
  { id: '2007', name: 'Bold Moves Bundle | Website | Other | 3D Modules', board: 'design', assignee: 'Natalie Abesdid', group: 'Review', type: 'Website', product: 'Bold Moves Bundle' },
  { id: '2008', name: 'Shampoo | Email | Product Feature', board: 'design', assignee: 'Dan Lowenstein', group: 'In Progress', type: 'Marketing', product: 'Shampoo' },
];

const MOCK_TASKS = [...MOCK_VIDEO_TASKS, ...MOCK_DESIGN_TASKS];

// ─── URL parsing ──────────────────────────────────────────────────────────────

function extractItemId(url: string): string | null {
  const patterns = [
    /\/items\/(\d+)/,
    /\/pulses\/(\d+)/,
    /[?&]itemId=(\d+)/,
    /[?&]pulseId=(\d+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface SaveResult {
  success: boolean;
  message: string;
}

export interface UseMondayDataReturn {
  allTasks: MondayTask[];
  /** True while the initial board data is loading. */
  tasksLoading: boolean;
  /** True while a save mutation is in-flight. */
  saveLoading: boolean;
  /** Non-null when the last API call failed. */
  error: string | null;
  /** True when the app is running with mock data instead of real API data. */
  usingMockData: boolean;
  findTaskByUrl: (url: string) => Promise<MondayTask | null>;
  saveAdName: (taskId: string, boardId: string, adName: string) => Promise<SaveResult>;
  refetch: () => void;
}

export function useMondayData(): UseMondayDataReturn {
  const [allTasks, setAllTasks] = useState<MondayTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);

  // ── Initial load ─────────────────────────────────────────────────────────────
  const fetchAllTasks = useCallback(async () => {
    if (!isLive) {
      setAllTasks(MOCK_TASKS);
      setUsingMockData(true);
      return;
    }

    setTasksLoading(true);
    setError(null);

    try {
      const [videoTasks, designTasks] = await Promise.all([
        mondayClient.getBoardItems(
          ENV.VIDEO_BOARD_ID,
          'video',
          VIDEO_COLUMN_IDS,
          ENV.VIDEO_TYPE_COLUMN_ID,
        ),
        mondayClient.getBoardItems(
          ENV.DESIGN_BOARD_ID,
          'design',
          DESIGN_COLUMN_IDS,
          ENV.DESIGN_TYPE_COLUMN_ID,
        ),
      ]);
      setAllTasks([...videoTasks, ...designTasks]);
      setUsingMockData(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load tasks: ${msg}`);
      // Graceful fallback so the UI is never empty
      setAllTasks(MOCK_TASKS);
      setUsingMockData(true);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllTasks();
  }, [fetchAllTasks]);

  // ── Quick Import ──────────────────────────────────────────────────────────────
  const findTaskByUrl = useCallback(
    async (url: string): Promise<MondayTask | null> => {
      const itemId = extractItemId(url);
      if (!itemId) return null;

      // 1. Check local cache first (instant)
      const cached = allTasks.find((t) => t.id === itemId);
      if (cached) return cached;

      // 2. If live, ask the API for the item directly
      if (isLive && hasBoardIds) {
        try {
          return await mondayClient.getItemById(
            itemId,
            ENV.VIDEO_BOARD_ID,
            ENV.DESIGN_BOARD_ID,
          );
        } catch {
          return null;
        }
      }

      return null;
    },
    [allTasks],
  );

  // ── Save mutation ─────────────────────────────────────────────────────────────
  const saveAdName = useCallback(
    async (taskId: string, boardId: string, adName: string): Promise<SaveResult> => {
      // READ_MODE guard — checked here so no caller can bypass it
      if (isReadMode) {
        return {
          success: false,
          message: 'Read-only mode is enabled. Set VITE_READ_MODE=false to save changes.',
        };
      }

      if (!isLive) {
        // Mock save — simulate a network delay
        await new Promise((r) => setTimeout(r, 800));
        console.info(`[Mock] Saved ad name to task ${taskId}:`, adName);
        return { success: true, message: 'Saved (mock)' };
      }

      setSaveLoading(true);
      try {
        const columnId =
          boardId === ENV.VIDEO_BOARD_ID
            ? ENV.AD_NAME_COLUMN_ID
            : ENV.DESIGN_AD_NAME_COLUMN_ID;
        await mondayClient.saveAdName(boardId, taskId, adName, columnId);
        return { success: true, message: 'Saved to monday.com!' };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, message: `Save failed: ${msg}` };
      } finally {
        setSaveLoading(false);
      }
    },
    [],
  );

  return {
    allTasks,
    tasksLoading,
    saveLoading,
    error,
    usingMockData,
    findTaskByUrl,
    saveAdName,
    refetch: fetchAllTasks,
  };
}
