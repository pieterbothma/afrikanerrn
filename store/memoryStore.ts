import { create } from 'zustand';

import {
  createMemory as apiCreateMemory,
  deleteMemory as apiDeleteMemory,
  fetchMemories,
  MemoryPayload,
  MemoryType,
  MemoryUpdatePayload,
  updateMemory as apiUpdateMemory,
  UserMemory,
} from '@/lib/memories';

type MemoryStore = {
  memories: UserMemory[];
  isLoading: boolean;
  error: string | null;
  loadMemories: (userId: string) => Promise<void>;
  addMemory: (userId: string, payload: Omit<MemoryPayload, 'userId'>) => Promise<UserMemory | null>;
  editMemory: (
    userId: string,
    memoryId: string,
    updates: MemoryUpdatePayload,
  ) => Promise<UserMemory | null>;
  removeMemory: (userId: string, memoryId: string) => Promise<boolean>;
  setMemories: (memories: UserMemory[]) => void;
};

export const useMemoryStore = create<MemoryStore>((set, get) => ({
  memories: [],
  isLoading: false,
  error: null,
  loadMemories: async (userId: string) => {
    if (!userId) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const data = await fetchMemories(userId);
      set({ memories: data, isLoading: false });
    } catch (error: any) {
      console.error('Kon nie herinneringe laai nie:', error?.message || error);
      set({ error: error?.message || 'Kon nie herinneringe laai nie.', isLoading: false });
    }
  },
  addMemory: async (userId, payload) => {
    if (!userId) {
      return null;
    }

    const optimistic: UserMemory = {
      id: `temp-${Date.now()}`,
      userId,
      type: payload.type as MemoryType,
      title: payload.title,
      content: payload.content,
      metadata: payload.metadata ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set({ memories: [optimistic, ...get().memories] });

    const created = await apiCreateMemory({ ...payload, userId });

    if (!created) {
      // Revert optimistic insert
      set({ memories: get().memories.filter((memory) => memory.id !== optimistic.id) });
      return null;
    }

    set({
      memories: get().memories.map((memory) =>
        memory.id === optimistic.id ? created : memory,
      ),
    });

    return created;
  },
  editMemory: async (userId, memoryId, updates) => {
    if (!userId) {
      return null;
    }

    const previous = get().memories;
    const idx = previous.findIndex((memory) => memory.id === memoryId);
    if (idx === -1) {
      return null;
    }

    const updatedOptimistic: UserMemory = {
      ...previous[idx],
      ...updates,
      metadata: updates.metadata ?? previous[idx].metadata,
      updatedAt: new Date().toISOString(),
    };

    const optimisticMemories = [...previous];
    optimisticMemories[idx] = updatedOptimistic;
    set({ memories: optimisticMemories });

    const updated = await apiUpdateMemory(memoryId, userId, updates);

    if (!updated) {
      // Revert to previous state
      set({ memories: previous });
      return null;
    }

    set({
      memories: get().memories.map((memory) =>
        memory.id === memoryId ? updated : memory,
      ),
    });

    return updated;
  },
  removeMemory: async (userId, memoryId) => {
    if (!userId) {
      return false;
    }

    const previous = get().memories;
    set({ memories: previous.filter((memory) => memory.id !== memoryId) });

    const deleted = await apiDeleteMemory(memoryId, userId);
    if (!deleted) {
      set({ memories: previous });
      return false;
    }

    return true;
  },
  setMemories: (memories: UserMemory[]) => set({ memories }),
}));

