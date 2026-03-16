/**
 * Typed, validated access to all VITE_ environment variables.
 * All other files should import from here instead of reading
 * import.meta.env directly.
 *
 * Board IDs and column IDs are pre-filled with verified defaults
 * for the "Video Projects" and "Design Projects - 2.0" boards.
 */
export const ENV = {
  /** Monday.com personal API token. Empty string means "not configured". */
  MONDAY_API_KEY: import.meta.env.VITE_MONDAY_API_KEY ?? '',

  /**
   * When true the app is in read-only mode:
   *  - All monday.com mutations are blocked.
   *  - "Save to Task" button is hidden / disabled.
   */
  READ_MODE: import.meta.env.VITE_READ_MODE === 'true',

  // ── Board IDs ───────────────────────────────────────────────────────────────
  VIDEO_BOARD_ID: import.meta.env.VITE_VIDEO_BOARD_ID || '5433027071',
  DESIGN_BOARD_ID: import.meta.env.VITE_DESIGN_BOARD_ID || '8036329818',

  // ── Column IDs ──────────────────────────────────────────────────────────────
  /** People column — identical id on both boards */
  ASSIGNEE_COLUMN_ID: import.meta.env.VITE_ASSIGNEE_COLUMN_ID || 'people',

  /** "Ad Name" text column — Video Projects board */
  AD_NAME_COLUMN_ID: import.meta.env.VITE_AD_NAME_COLUMN_ID || 'text_mm1fn440',

  /** "Ad Name" text column — Design Projects - 2.0 board */
  DESIGN_AD_NAME_COLUMN_ID: import.meta.env.VITE_DESIGN_AD_NAME_COLUMN_ID || 'text_mm1grv7e',

  /** "Type" status column on Video Projects ("GIF - New Static", "UGC/Creator", …) */
  VIDEO_TYPE_COLUMN_ID: import.meta.env.VITE_VIDEO_TYPE_COLUMN_ID || 'label4',

  /** "Type" status column on Design Projects - 2.0 ("Website", "Creative", …) */
  DESIGN_TYPE_COLUMN_ID: import.meta.env.VITE_DESIGN_TYPE_COLUMN_ID || 'status_1__1',

  /** Product/Bundle status column — identical id on both boards */
  PRODUCT_COLUMN_ID: import.meta.env.VITE_PRODUCT_COLUMN_ID || 'label9',
} as const;

/** True when a Monday.com API key has been configured. */
export const hasApiKey = ENV.MONDAY_API_KEY.trim().length > 0;

/** True when both board IDs have been configured. */
export const hasBoardIds =
  ENV.VIDEO_BOARD_ID.trim().length > 0 &&
  ENV.DESIGN_BOARD_ID.trim().length > 0;

/** True when the app can make real API calls. */
export const isLive = hasApiKey && hasBoardIds;

/** True when write operations are blocked. */
export const isReadMode = ENV.READ_MODE;

/**
 * The column IDs to request per board — keeps API responses lean
 * by only fetching what the app actually uses.
 */
export const VIDEO_COLUMN_IDS = [
  ENV.ASSIGNEE_COLUMN_ID,
  ENV.PRODUCT_COLUMN_ID,
  ENV.VIDEO_TYPE_COLUMN_ID,
  ENV.AD_NAME_COLUMN_ID,
];

export const DESIGN_COLUMN_IDS = [
  ENV.ASSIGNEE_COLUMN_ID,
  ENV.PRODUCT_COLUMN_ID,
  ENV.DESIGN_TYPE_COLUMN_ID,
  ENV.DESIGN_AD_NAME_COLUMN_ID,
];
