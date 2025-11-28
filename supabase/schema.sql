-- Supabase databasis skema vir Afrikaner.ai
-- Hardloop hierdie skrip in jou Supabase SQL Editor.

-- Vereiste uitbreiding vir gen_random_uuid()
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  display_name text,
  avatar_url text,
  tone_preset text default 'informeel' check (tone_preset in ('formeel', 'informeel', 'vriendelik')),
  session_count integer default 0,
  tier text default 'free' check (tier in ('free', 'premium'))
);

alter table public.profiles enable row level security;

create policy "Self: select profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Self: update profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.messages enable row level security;

create policy "Self: insert message"
  on public.messages
  for insert
  with check (auth.uid() = user_id);

create policy "Self: select messages"
  on public.messages
  for select
  using (auth.uid() = user_id);

create policy "Self: update message"
  on public.messages
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Self: delete message"
  on public.messages
  for delete
  using (auth.uid() = user_id);

-- Usage tracking table for rate limiting
create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('chat', 'image_generate', 'image_edit')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.usage_logs enable row level security;

create policy "Self: insert usage log"
  on public.usage_logs
  for insert
  with check (auth.uid() = user_id);

create policy "Self: select usage logs"
  on public.usage_logs
  for select
  using (auth.uid() = user_id);

-- Index for fast daily usage queries
create index if not exists idx_usage_logs_user_date on public.usage_logs(user_id, created_at);

-- Conversations table (if not exists)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.conversations enable row level security;

create policy "Self: insert conversation"
  on public.conversations
  for insert
  with check (auth.uid() = user_id);

create policy "Self: select conversations"
  on public.conversations
  for select
  using (auth.uid() = user_id);

create policy "Self: update conversation"
  on public.conversations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Self: delete conversation"
  on public.conversations
  for delete
  using (auth.uid() = user_id);

-- Update messages table to include conversation_id and other fields
alter table public.messages add column if not exists conversation_id uuid references public.conversations (id) on delete cascade;
alter table public.messages add column if not exists is_favorite boolean default false;
alter table public.messages add column if not exists is_pinned boolean default false;
alter table public.messages add column if not exists tags text[] default '{}';

-- Add document columns for file attachments
alter table public.messages add column if not exists document_url text;
alter table public.messages add column if not exists document_name text;
alter table public.messages add column if not exists document_mime_type text;
alter table public.messages add column if not exists document_size integer;

-- Memories table for storing user-specific facts and preferences
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('profile', 'preference', 'fact')),
  title text not null,
  content text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_memories_user on public.memories (user_id, created_at desc);

alter table public.memories enable row level security;

create policy "Self: select memories"
  on public.memories
  for select
  using (auth.uid() = user_id);

create policy "Self: insert memories"
  on public.memories
  for insert
  with check (auth.uid() = user_id);

create policy "Self: update memories"
  on public.memories
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Self: delete memories"
  on public.memories
  for delete
  using (auth.uid() = user_id);

