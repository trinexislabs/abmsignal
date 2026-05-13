-- profiles table
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  email text not null,
  name text,
  plan text default 'starter' check (plan in ('starter', 'growth', 'professional', 'agency')),
  created_at timestamptz default now()
);

-- playbooks table
create table if not exists playbooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  product_name text not null,
  product_url text,
  product_brief jsonb,
  target_company text not null,
  target_url text,
  industry text,
  geography text,
  priority_tier integer default 1 check (priority_tier in (1, 2)),
  status text default 'draft' check (status in ('draft', 'researching', 'contact_review', 'generating', 'reviewing', 'complete')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- playbook_sections table
create table if not exists playbook_sections (
  id uuid primary key default gen_random_uuid(),
  playbook_id uuid references playbooks(id) on delete cascade not null,
  section_type text not null,
  section_number integer not null,
  content jsonb,
  status text default 'draft' check (status in ('draft', 'complete', 'reviewed')),
  created_at timestamptz default now()
);

-- contacts table
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  playbook_id uuid references playbooks(id) on delete cascade not null,
  name text not null,
  title text,
  linkedin_url text,
  email text,
  confidence text default 'medium' check (confidence in ('high', 'medium', 'low')),
  source text,
  verification_status text default 'pending' check (verification_status in ('pending', 'confirmed', 'needs_review', 'removed')),
  created_at timestamptz default now()
);

-- quality_checks table
create table if not exists quality_checks (
  id uuid primary key default gen_random_uuid(),
  playbook_id uuid references playbooks(id) on delete cascade not null,
  check_number integer not null,
  check_name text not null,
  status text default 'pending' check (status in ('pending', 'pass', 'warning', 'fail')),
  details text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table profiles enable row level security;
alter table playbooks enable row level security;
alter table playbook_sections enable row level security;
alter table contacts enable row level security;
alter table quality_checks enable row level security;

-- RLS policies
create policy "Users can view own profile" on profiles for select using (auth.uid() = user_id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = user_id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = user_id);

create policy "Users can view own playbooks" on playbooks for select using (auth.uid() = user_id);
create policy "Users can insert own playbooks" on playbooks for insert with check (auth.uid() = user_id);
create policy "Users can update own playbooks" on playbooks for update using (auth.uid() = user_id);
create policy "Users can delete own playbooks" on playbooks for delete using (auth.uid() = user_id);

create policy "Users can view own playbook sections" on playbook_sections for select using (
  exists (select 1 from playbooks where id = playbook_sections.playbook_id and user_id = auth.uid())
);
create policy "Users can manage own playbook sections" on playbook_sections for all using (
  exists (select 1 from playbooks where id = playbook_sections.playbook_id and user_id = auth.uid())
);

create policy "Users can view own contacts" on contacts for select using (
  exists (select 1 from playbooks where id = contacts.playbook_id and user_id = auth.uid())
);
create policy "Users can manage own contacts" on contacts for all using (
  exists (select 1 from playbooks where id = contacts.playbook_id and user_id = auth.uid())
);

create policy "Users can view own quality checks" on quality_checks for select using (
  exists (select 1 from playbooks where id = quality_checks.playbook_id and user_id = auth.uid())
);
create policy "Users can manage own quality checks" on quality_checks for all using (
  exists (select 1 from playbooks where id = quality_checks.playbook_id and user_id = auth.uid())
);

-- Function to auto-update updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_playbooks_updated_at
  before update on playbooks
  for each row execute function update_updated_at_column();

-- Auto-create profile on user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
