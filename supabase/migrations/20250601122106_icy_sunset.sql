-- Create users table
create table public.users (
  id uuid references auth.users primary key,
  created_at timestamp with time zone default now(),
  email text not null,
  name text,
  avatar_url text
);

-- Enable RLS for users table
alter table public.users enable row level security;

-- Users can view their own data
create policy "Users can view their own data"
  on public.users for select
  using (auth.uid() = id);

-- Users can update their own data
create policy "Users can update their own data"
  on public.users for update
  using (auth.uid() = id);

-- Create queries table
create table public.queries (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  user_id uuid references public.users(id),
  query_text text not null,
  response_text text not null,
  sources jsonb default '[]'::jsonb,
  notes text,
  tags text[] default '{}'::text[]
);

-- Enable RLS for queries table
alter table public.queries enable row level security;

-- Users can view their own queries
create policy "Users can view their own queries"
  on public.queries for select
  using (auth.uid() = user_id);

-- Users can insert their own queries
create policy "Users can insert their own queries"
  on public.queries for insert
  with check (auth.uid() = user_id);

-- Users can update their own queries
create policy "Users can update their own queries"
  on public.queries for update
  using (auth.uid() = user_id);

-- Create functions for query caching
create or replace function public.get_cached_query(
  search_query text,
  max_age_minutes integer default 5
)
returns table (
  id uuid,
  created_at timestamptz,
  query_text text,
  response_text text,
  sources jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    q.id,
    q.created_at,
    q.query_text,
    q.response_text,
    q.sources
  from
    queries q
  where
    q.query_text ilike '%' || search_query || '%'
    and q.created_at >= (now() - (max_age_minutes || ' minutes')::interval)
  order by
    q.created_at desc
  limit 1;
end;
$$;