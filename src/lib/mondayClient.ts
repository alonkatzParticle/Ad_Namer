/**
 * Thin Monday.com GraphQL API v2 client.
 *
 * All functions are pure async helpers — no React state lives here.
 * Import and call these from hooks/useMondayData.ts.
 */

import { MondayTask } from '@/types';
import { ENV } from './env';

const API_URL = 'https://api.monday.com/v2';
const API_VERSION = '2024-01';

// ─── Low-level fetch ─────────────────────────────────────────────────────────

interface GqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

async function gql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: ENV.MONDAY_API_KEY,
      'API-Version': API_VERSION,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Monday API HTTP ${res.status}: ${res.statusText}`);
  }

  const json: GqlResponse<T> = await res.json();

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }

  if (!json.data) {
    throw new Error('Monday API returned no data');
  }

  return json.data;
}

// ─── GraphQL queries / mutations ─────────────────────────────────────────────

/**
 * Fetch board items with a specific set of column IDs.
 * $limit is capped at 500 (Monday.com max per page).
 * No pagination — callers pass a limit and get back exactly that many
 * of the most-recently-updated items in a single fast request.
 */
const GET_BOARD_ITEMS = /* GraphQL */ `
  query GetBoardItems($boardId: ID!, $limit: Int!, $columnIds: [String!]) {
    boards(ids: [$boardId]) {
      items_page(limit: $limit) {
        cursor
        items {
          id
          name
          group {
            title
          }
          column_values(ids: $columnIds) {
            id
            text
          }
        }
      }
    }
  }
`;

/**
 * Fetch a single item by its ID. Returns all column values so that
 * we can handle Quick Import regardless of which board the item lives on.
 */
const GET_ITEM_BY_ID = /* GraphQL */ `
  query GetItem($itemId: ID!) {
    items(ids: [$itemId]) {
      id
      name
      board {
        id
      }
      group {
        title
      }
      column_values {
        id
        text
      }
    }
  }
`;

const GET_ITEM_UPDATES = /* GraphQL */ `
  query GetItemUpdates($itemId: ID!) {
    items(ids: [$itemId]) {
      updates(limit: 20) {
        text_body
      }
    }
  }
`;

const UPDATE_AD_NAME = /* GraphQL */ `
  mutation UpdateAdName(
    $boardId: ID!
    $itemId: ID!
    $columnId: String!
    $value: String!
  ) {
    change_simple_column_value(
      board_id: $boardId
      item_id: $itemId
      column_id: $columnId
      value: $value
    ) {
      id
    }
  }
`;

// ─── Raw Monday types ─────────────────────────────────────────────────────────

interface RawColumnValue {
  id: string;
  text: string;
}

interface RawItem {
  id: string;
  name: string;
  board?: { id: string };
  group: { title: string };
  column_values: RawColumnValue[];
}

interface BoardItemsData {
  boards: Array<{
    items_page: {
      items: RawItem[];
    };
  }>;
}

interface ItemByIdData {
  items: RawItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalises an empty / whitespace-only string to undefined. */
function present(s: string | undefined): string | undefined {
  return s && s.trim() ? s.trim() : undefined;
}

function rawToTask(
  item: RawItem,
  board: 'video' | 'design',
  typeColumnId: string,
): MondayTask {
  const col = (id: string) =>
    present(item.column_values.find((c) => c.id === id)?.text);

  return {
    id: item.id,
    name: item.name,
    board,
    assignee: col(ENV.ASSIGNEE_COLUMN_ID),
    group: present(item.group?.title),
    adName: col(ENV.AD_NAME_COLUMN_ID),
    type: col(typeColumnId),
    product: col(ENV.PRODUCT_COLUMN_ID),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch the most-recently-active items from a single board.
 *
 * Strategy: single API request — no pagination loop.
 * Monday.com returns items in default board order (newest first).
 * `limit` is capped at 500 (the Monday.com maximum per page).
 *
 * For boards with thousands of items this loads instantly instead of
 * making 10–20 sequential paginated requests. Users can reach any
 * specific task via Quick Import regardless of the browse limit.
 */
export async function getBoardItems(
  boardId: string,
  boardType: 'video' | 'design',
  columnIds: string[],
  typeColumnId: string,
  limit = 500,
): Promise<MondayTask[]> {
  const data: BoardItemsData = await gql<BoardItemsData>(GET_BOARD_ITEMS, {
    boardId,
    limit: Math.min(limit, 500),
    columnIds,
  });

  const items = data.boards[0]?.items_page?.items ?? [];
  return items.map((item: RawItem) => rawToTask(item, boardType, typeColumnId));
}

/**
 * Fetch a single item by ID (used for Quick Import).
 * Determines board type by comparing the item's board.id against known IDs.
 */
export async function getItemById(
  itemId: string,
  videoBoardId: string,
  designBoardId: string,
): Promise<MondayTask | null> {
  const data = await gql<ItemByIdData>(GET_ITEM_BY_ID, { itemId });
  const item = data.items[0];
  if (!item) return null;

  let boardType: 'video' | 'design';
  if (item.board?.id === videoBoardId) {
    boardType = 'video';
  } else if (item.board?.id === designBoardId) {
    boardType = 'design';
  } else {
    // Item found but on an unrecognised board — treat as video
    boardType = 'video';
  }

  const typeColumnId =
    boardType === 'video' ? ENV.VIDEO_TYPE_COLUMN_ID : ENV.DESIGN_TYPE_COLUMN_ID;

  return rawToTask(item, boardType, typeColumnId);
}

/**
 * Update the ad-name column of an item.
 * Caller is responsible for checking READ_MODE before calling this.
 */
export async function saveAdName(
  boardId: string,
  itemId: string,
  adName: string,
  columnId: string,
): Promise<void> {
  await gql(UPDATE_AD_NAME, {
    boardId,
    itemId,
    columnId,
    value: adName,
  });
}

/**
 * Fetch the plain-text bodies of the most recent updates on an item.
 * Used to scan for creator names when they aren't in the task title.
 */
export async function getItemUpdates(itemId: string): Promise<string[]> {
  interface UpdatesData {
    items: Array<{ updates: Array<{ text_body: string }> }>;
  }
  const data = await gql<UpdatesData>(GET_ITEM_UPDATES, { itemId });
  return data.items[0]?.updates.map((u) => u.text_body).filter(Boolean) ?? [];
}
