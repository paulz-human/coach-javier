-- Enable RLS
alter table if exists public.profiles enable row level security;
alter table if exists public.sessions enable row level security;
alter table if exists public.messages enable row level security;

-- Profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  created_at timestamptz default now() not null,
  name text,
  goal text not null check (goal in ('general_fitness', 'lose_weight', 'run_race', 'improve_time')),
  weekly_frequency int not null check (weekly_frequency between 1 and 5),
  level text not null check (level in ('beginner', 'intermediate', 'advanced')),
  onboarding_completed boolean default false not null,
  subscription_status text default 'free' check (subscription_status in ('free', 'trial', 'paid')),
  trial_started_at timestamptz
);

-- Sessions
create table if not exists public.sessions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  user_id uuid references auth.users on delete cascade not null,
  planned_at timestamptz not null,
  completed_at timestamptz,
  status text not null check (status in ('planned', 'completed', 'skipped')),
  type text not null check (type in ('easy', 'tempo', 'intervals', 'long', 'recovery')),
  planned_distance_km numeric,
  actual_distance_km numeric,
  planned_duration_min int,
  actual_duration_min int,
  notes text
);

create index if not exists sessions_user_id_planned_at on public.sessions (user_id, planned_at desc);

-- Messages
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  user_id uuid references auth.users on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null
);

create index if not exists messages_user_id_created_at on public.messages (user_id, created_at asc);

-- RLS policies
create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can upsert own profile" on public.profiles for all using (auth.uid() = id);

create policy "Users can read own sessions" on public.sessions for select using (auth.uid() = user_id);
create policy "Users can insert own sessions" on public.sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions" on public.sessions for update using (auth.uid() = user_id);

create policy "Users can read own messages" on public.messages for select using (auth.uid() = user_id);
create policy "Users can insert own messages" on public.messages for insert with check (auth.uid() = user_id);
