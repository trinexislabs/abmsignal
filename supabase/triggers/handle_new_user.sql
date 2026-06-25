-- ABMSignal — profile + free-subscription bootstrap on sign-up
--
-- Replaces the old NextAuth `events.createUser` hook. When Supabase Auth creates
-- a new identity in auth.users, this trigger mirrors it into public."User" (the
-- profile table Prisma owns) and grants a free UserSubscription.
--
-- RUN THIS ONCE in the Supabase SQL Editor *AFTER* `prisma migrate deploy` has
-- created the public."User" and public."UserSubscription" tables.
-- Safe to re-run (idempotent).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public."User" (id, email, name, image, role, "createdAt", "updatedAt")
  values (
    new.id::text,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    'user',
    now(), now()
  )
  on conflict (id) do nothing;

  insert into public."UserSubscription" (id, "userId", plan, status, "createdAt", "updatedAt")
  values (gen_random_uuid()::text, new.id::text, 'free', 'active', now(), now())
  on conflict ("userId") do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
