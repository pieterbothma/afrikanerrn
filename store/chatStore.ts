import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import { cacheMessages, getCachedMessages, clearCache } from '@/lib/offlineCache';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUri?: string;
  previewUri?: string;
  documentUrl?: string;
  documentName?: string;
  documentMimeType?: string;
  documentSize?: number;
  createdAt: string;
  isFavorite?: boolean;
  isPinned?: boolean;
  tags?: string[];
  conversationId?: string;
};

export type Conversation = {
  id: string;
  userId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
};

type ChatStore = {
  messages: ChatMessage[];
  currentConversationId: string | null;
  conversations: Conversation[];
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;
  setCurrentConversationId: (id: string | null) => void;
  loadMessagesFromSupabase: (userId: string, conversationId?: string) => Promise<void>;
  saveMessageToSupabase: (message: ChatMessage, userId: string) => Promise<void>;
  loadConversations: (userId: string) => Promise<void>;
  createConversation: (userId: string, title?: string) => Promise<string | null>;
  deleteConversation: (conversationId: string) => Promise<void>;
  updateConversation: (conversationId: string, title: string) => Promise<void>;
};

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  currentConversationId: null,
  conversations: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set({ messages: [...get().messages, message] }),
  updateMessage: (id, updates) => {
    const messages = get().messages.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg));
    set({ messages });
  },
  clearMessages: () => set({ messages: [] }),
  setCurrentConversationId: (id) => set({ currentConversationId: id }),
  loadMessagesFromSupabase: async (userId: string, conversationId?: string) => {
    const cached = await getCachedMessages(userId, conversationId);
    if (cached) {
      set({ messages: cached });
    }

    let query = supabase
      .from('messages')
      .select('id, role, content, image_url, created_at, is_favorite, is_pinned, tags, conversation_id, document_url, document_name, document_mime_type, document_size')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (conversationId) {
      query = query.eq('conversation_id', conversationId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Kon nie boodskappe laai nie:', error.message);
      if (!cached) {
        set({ messages: [] });
      }
      return;
    }

    if (!data) {
      set({ messages: [] });
      await cacheMessages(userId, [], conversationId);
      return;
    }

    const mapped = data.map<ChatMessage>((row) => ({
      id: row.id,
      role: row.role as 'user' | 'assistant',
      content: row.content ?? '',
      imageUri: row.image_url ?? undefined,
      documentUrl: row.document_url ?? undefined,
      documentName: row.document_name ?? undefined,
      documentMimeType: row.document_mime_type ?? undefined,
      documentSize: row.document_size ?? undefined,
      createdAt: row.created_at ?? new Date().toISOString(),
      isFavorite: row.is_favorite ?? false,
      isPinned: row.is_pinned ?? false,
      tags: row.tags ?? [],
      conversationId: row.conversation_id ?? undefined,
    }));

    set({ messages: mapped });
    await cacheMessages(userId, mapped, conversationId);
  },
  saveMessageToSupabase: async (message, userId) => {
    const sanitizedMessage = { ...message };
    delete sanitizedMessage.previewUri;

    const sanitizedExisting = get().messages.map((msg) => {
      const clone = { ...msg };
      delete clone.previewUri;
      return clone;
    });

    const updatedMessages = [...sanitizedExisting, sanitizedMessage];
    await cacheMessages(userId, updatedMessages, sanitizedMessage.conversationId);

    // Verify and refresh Supabase session
    let { data: sessionData } = await supabase.auth.getSession();
    let authUserId = sessionData?.session?.user?.id;
    
    // If no session, try to refresh it
    if (!authUserId) {
      console.warn('[RLS Debug] Geen sessie, probeer refresh...');
      const { data: refreshData } = await supabase.auth.refreshSession();
      sessionData = refreshData;
      authUserId = refreshData?.session?.user?.id;
    }
    
    if (!authUserId) {
      console.error('[RLS Debug] Geen Supabase sessie gevind - gebruiker nie geauthentiseer nie');
      throw new Error('Jy moet aangemeld wees om boodskappe te stoor. Meld asseblief weer aan.');
    }
    
    if (authUserId !== userId) {
      console.error(`[RLS Debug] Sessie mismatch: auth.uid()=${authUserId}, userId=${userId}`);
      throw new Error('Gebruiker ID stem nie ooreen met sessie nie.');
    }

    console.log(`[RLS Debug] Stoor boodskap vir gebruiker: ${userId.substring(0, 8)}...`);

    const { error } = await supabase.from('messages').insert({
      id: sanitizedMessage.id,
      user_id: userId, // Critical: Must include user_id for RLS policy
      role: sanitizedMessage.role,
      content: sanitizedMessage.content,
      image_url: sanitizedMessage.imageUri ?? null,
      document_url: sanitizedMessage.documentUrl ?? null,
      document_name: sanitizedMessage.documentName ?? null,
      document_mime_type: sanitizedMessage.documentMimeType ?? null,
      document_size: sanitizedMessage.documentSize ?? null,
      created_at: sanitizedMessage.createdAt,
      is_favorite: sanitizedMessage.isFavorite ?? false,
      is_pinned: sanitizedMessage.isPinned ?? false,
      tags: sanitizedMessage.tags ?? [],
      conversation_id: sanitizedMessage.conversationId ?? null,
    });

    if (error) {
      console.error('Kon nie boodskap stoor nie:', error.message);
      console.error('[RLS Debug] Volledige fout:', JSON.stringify(error, null, 2));
    } else {
      console.log('[RLS Debug] Boodskap suksesvol gestoor');
    }
  },
  loadConversations: async (userId: string) => {
    const { data, error } = await supabase
      .from('conversations')
      .select('id, user_id, title, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Kon nie gesprekke laai nie:', error.message);
      return;
    }

    if (!data) {
      set({ conversations: [] });
      return;
    }

    const mapped = data.map<Conversation>((row) => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      createdAt: row.created_at ?? new Date().toISOString(),
      updatedAt: row.updated_at ?? new Date().toISOString(),
    }));

    set({ conversations: mapped });
  },
  createConversation: async (userId: string, title?: string) => {
    // Verify and refresh Supabase session
    let { data: sessionData } = await supabase.auth.getSession();
    let authUserId = sessionData?.session?.user?.id;
    
    // If no session, try to refresh it
    if (!authUserId) {
      console.warn('[RLS Debug] Geen sessie vir gesprek, probeer refresh...');
      const { data: refreshData } = await supabase.auth.refreshSession();
      sessionData = refreshData;
      authUserId = refreshData?.session?.user?.id;
    }
    
    if (!authUserId) {
      console.error('[RLS Debug] Geen Supabase sessie vir gesprek skep');
      throw new Error('Jy moet aangemeld wees om gesprekke te skep. Meld asseblief weer aan.');
    }
    
    if (authUserId !== userId) {
      console.error(`[RLS Debug] Gesprek sessie mismatch: auth.uid()=${authUserId}, userId=${userId}`);
      throw new Error('Gebruiker ID stem nie ooreen met sessie nie.');
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId, // Critical: Must include user_id for RLS policy
        title: title ?? null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Kon nie gesprek skep nie:', error.message);
      console.error('[RLS Debug] Volledige gesprek fout:', JSON.stringify(error, null, 2));
      return null;
    }

    await get().loadConversations(userId);
    return data?.id ?? null;
  },
  deleteConversation: async (conversationId: string) => {
    const { error } = await supabase.from('conversations').delete().eq('id', conversationId);

    if (error) {
      console.error('Kon nie gesprek skrap nie:', error.message);
      return;
    }

    const conversations = get().conversations.filter((c) => c.id !== conversationId);
    set({ conversations });

    if (get().currentConversationId === conversationId) {
      set({ currentConversationId: null, messages: [] });
    }
  },
  updateConversation: async (conversationId: string, title: string) => {
    const { error } = await supabase
      .from('conversations')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    if (error) {
      console.error('Kon nie gesprek opdateer nie:', error.message);
      return;
    }

    const conversations = get().conversations.map((c) =>
      c.id === conversationId ? { ...c, title, updatedAt: new Date().toISOString() } : c,
    );
    set({ conversations });
  },
}));

