import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_CHILD_ID = 'child_1';
const CHILDREN_STATE_KEY = 'kodomo_kimochi_children_state_v1';

export const MAX_CHILDREN = 5;

export type ChildProfile = {
  id: string;
  name: string;
  createdAt: string;
};

export type ChildrenState = {
  children: ChildProfile[];
  selectedChildId: string;
};

function createDefaultChild(): ChildProfile {
  return {
    id: DEFAULT_CHILD_ID,
    name: '子ども1',
    createdAt: new Date().toISOString(),
  };
}

function normalizeChildrenState(raw: unknown): ChildrenState {
  if (!raw || typeof raw !== 'object') {
    const child = createDefaultChild();
    return { children: [child], selectedChildId: child.id };
  }

  const input = raw as Partial<ChildrenState>;
  const children = Array.isArray(input.children)
    ? input.children.filter(
        (c): c is ChildProfile =>
          !!c &&
          typeof c.id === 'string' &&
          c.id.length > 0 &&
          typeof c.name === 'string' &&
          typeof c.createdAt === 'string'
      )
    : [];

  const withDefault =
    children.length > 0
      ? children
      : [createDefaultChild()];

  const selectedChildId =
    typeof input.selectedChildId === 'string' &&
    withDefault.some((child) => child.id === input.selectedChildId)
      ? input.selectedChildId
      : withDefault[0].id;

  return { children: withDefault, selectedChildId };
}

export async function getChildrenState(): Promise<ChildrenState> {
  const raw = await AsyncStorage.getItem(CHILDREN_STATE_KEY);
  if (!raw) {
    const initial = normalizeChildrenState(null);
    await AsyncStorage.setItem(CHILDREN_STATE_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    const parsed = JSON.parse(raw);
    const normalized = normalizeChildrenState(parsed);
    await AsyncStorage.setItem(CHILDREN_STATE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    const initial = normalizeChildrenState(null);
    await AsyncStorage.setItem(CHILDREN_STATE_KEY, JSON.stringify(initial));
    return initial;
  }
}

export async function setSelectedChildId(selectedChildId: string): Promise<ChildrenState> {
  const current = await getChildrenState();
  const nextId = current.children.some((child) => child.id === selectedChildId)
    ? selectedChildId
    : current.selectedChildId;
  const next = { ...current, selectedChildId: nextId };
  await AsyncStorage.setItem(CHILDREN_STATE_KEY, JSON.stringify(next));
  return next;
}

export async function addChild(name?: string): Promise<ChildrenState> {
  const current = await getChildrenState();
  if (current.children.length >= MAX_CHILDREN) return current;

  const nextIndex = current.children.length + 1;
  const child: ChildProfile = {
    id: `child_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: (name ?? '').trim() || `子ども${nextIndex}`,
    createdAt: new Date().toISOString(),
  };

  const next: ChildrenState = {
    children: [...current.children, child],
    selectedChildId: child.id,
  };
  await AsyncStorage.setItem(CHILDREN_STATE_KEY, JSON.stringify(next));
  return next;
}

export async function renameChild(childId: string, name: string): Promise<ChildrenState> {
  const current = await getChildrenState();
  const trimmed = name.trim();
  if (!trimmed) return current;

  const next: ChildrenState = {
    ...current,
    children: current.children.map((child) =>
      child.id === childId ? { ...child, name: trimmed } : child
    ),
  };
  await AsyncStorage.setItem(CHILDREN_STATE_KEY, JSON.stringify(next));
  return next;
}

/**
 * childId 指定の子どもを削除する（最低1人は残す）。
 * 削除対象が選択中の場合は、残った先頭の子どもに選択を移す。
 */
export async function removeChild(childId: string): Promise<ChildrenState> {
  const current = await getChildrenState();
  if (current.children.length <= 1) return current;

  const exists = current.children.some((c) => c.id === childId);
  if (!exists) return current;

  const nextChildren = current.children.filter((c) => c.id !== childId);
  if (nextChildren.length <= 0) return current; // 念のため

  const nextSelectedChildId =
    current.selectedChildId === childId ? nextChildren[0].id : current.selectedChildId;

  const next: ChildrenState = {
    ...current,
    children: nextChildren,
    selectedChildId: nextSelectedChildId,
  };

  await AsyncStorage.setItem(CHILDREN_STATE_KEY, JSON.stringify(next));
  return next;
}
