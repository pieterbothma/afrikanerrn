import { supabase } from '@/lib/supabase';

export const MEMORY_TYPES = ['profile', 'preference', 'fact'] as const;
export type MemoryType = (typeof MEMORY_TYPES)[number];

export type UserMemory = {
  id: string;
  userId: string;
  type: MemoryType;
  title: string;
  content: string;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
};

export type MemoryPayload = {
  userId: string;
  type: MemoryType;
  title: string;
  content: string;
  metadata?: Record<string, any> | null;
};

export type MemoryUpdatePayload = Partial<Omit<MemoryPayload, 'userId'>> & {
  metadata?: Record<string, any> | null;
};

const mapRowToMemory = (row: any): UserMemory => ({
  id: row.id,
  userId: row.user_id,
  type: row.type as MemoryType,
  title: row.title,
  content: row.content,
  metadata: row.metadata ?? null,
  createdAt: row.created_at ?? new Date().toISOString(),
  updatedAt: row.updated_at ?? new Date().toISOString(),
});

export async function fetchMemories(userId: string): Promise<UserMemory[]> {
  const { data, error } = await supabase
    .from('memories')
    .select('id, user_id, type, title, content, metadata, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Kon nie herinneringe laai nie:', error.message);
    return [];
  }

  return (data ?? []).map(mapRowToMemory);
}

export async function createMemory(payload: MemoryPayload): Promise<UserMemory | null> {
  const { data, error } = await supabase
    .from('memories')
    .insert({
      user_id: payload.userId,
      type: payload.type,
      title: payload.title,
      content: payload.content,
      metadata: payload.metadata ?? null,
    })
    .select('id, user_id, type, title, content, metadata, created_at, updated_at')
    .single();

  if (error) {
    console.error('Kon nie herinnering skep nie:', error.message);
    return null;
  }

  return mapRowToMemory(data);
}

export async function updateMemory(
  id: string,
  userId: string,
  updates: MemoryUpdatePayload,
): Promise<UserMemory | null> {
  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof updates.type !== 'undefined') {
    updatePayload.type = updates.type;
  }
  if (typeof updates.title !== 'undefined') {
    updatePayload.title = updates.title;
  }
  if (typeof updates.content !== 'undefined') {
    updatePayload.content = updates.content;
  }
  if (typeof updates.metadata !== 'undefined') {
    updatePayload.metadata = updates.metadata ?? null;
  }

  const { data, error } = await supabase
    .from('memories')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', userId)
    .select('id, user_id, type, title, content, metadata, created_at, updated_at')
    .single();

  if (error) {
    console.error('Kon nie herinnering opdateer nie:', error.message);
    return null;
  }

  return mapRowToMemory(data);
}

export async function deleteMemory(id: string, userId: string): Promise<boolean> {
  const { error } = await supabase.from('memories').delete().eq('id', id).eq('user_id', userId);

  if (error) {
    console.error('Kon nie herinnering skrap nie:', error.message);
    return false;
  }

  return true;
}

