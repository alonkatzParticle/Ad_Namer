/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_READ_MODE: string;
  readonly VITE_VIDEO_BOARD_ID: string;
  readonly VITE_DESIGN_BOARD_ID: string;
  // Column IDs
  readonly VITE_ASSIGNEE_COLUMN_ID: string;
  readonly VITE_AD_NAME_COLUMN_ID: string;
  readonly VITE_VIDEO_TYPE_COLUMN_ID: string;
  readonly VITE_DESIGN_TYPE_COLUMN_ID: string;
  readonly VITE_PRODUCT_COLUMN_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
