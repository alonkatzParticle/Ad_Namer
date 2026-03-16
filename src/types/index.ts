export interface MondayTask {
  id: string;
  name: string;
  board: 'video' | 'design';
  /** Full name of the assigned person, e.g. "Isaac Yashar" or "matan shapira" */
  assignee?: string;
  group?: string;
  /** Current value of the Ad Name column (Video board only) */
  adName?: string;
  /**
   * Raw value of the Type column.
   * Video board — e.g. "GIF - New Static", "UGC/Creator", "Iterations/Cuts/Edits"
   * Design board — e.g. "Website", "Creative", "GIF Design"
   */
  type?: string;
  /** Raw value of the Product/Bundle column, e.g. "Power Shower Set" */
  product?: string;
}

export interface AdParams {
  product: string;
  conceptName: string;
  branded: string;
  assetType: string;
  versions: number[];
  designerEditor: string;
  headlines: number[];
  texts: number[];
  pageType: string;
  profileName: string;
  creator: string;
}

export const INITIAL_PARAMS: AdParams = {
  product: '',
  conceptName: '',
  branded: 'Branded',
  assetType: 'Video',
  versions: [],
  designerEditor: '',
  headlines: [],
  texts: [],
  pageType: '',
  profileName: '',
  creator: '',
};
