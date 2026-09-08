-- Evolução para plataforma multiusuário: uma conta possui um convite.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists email text not null default '';

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

insert into public.platform_admins (user_id)
select id from auth.users where lower(email) = 'freelas.jequie@gmail.com'
on conflict (user_id) do nothing;

insert into public.profiles (user_id, full_name, email, created_at)
select id, coalesce(raw_user_meta_data ->> 'full_name', ''), coalesce(email, ''), created_at
from auth.users
on conflict (user_id) do nothing;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins where user_id = auth.uid()
  );
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  child_name text not null,
  age text not null,
  headline text not null,
  introduction text not null,
  event_date text not null,
  event_time text not null,
  venue text not null,
  address text not null,
  attire text not null,
  attire_note text not null,
  max_guests smallint not null check (max_guests between 1 and 10),
  soundtrack_url text not null default '',
  background_image text not null default '/hero-ocean.png',
  gift_names text[] not null default '{}',
  family_signature text not null,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Preserva o convite configurado anteriormente ao criar convites para usuários existentes.
insert into public.invitations (
  owner_id, slug, child_name, age, headline, introduction, event_date,
  event_time, venue, address, attire, attire_note, max_guests,
  soundtrack_url, background_image, gift_names, family_signature
)
select
  users.id,
  'convite-' || substring(replace(users.id::text, '-', ''), 1, 8),
  settings.child_name,
  settings.age,
  settings.headline,
  settings.introduction,
  settings.event_date,
  settings.event_time,
  settings.venue,
  settings.address,
  settings.attire,
  settings.attire_note,
  settings.max_guests,
  settings.soundtrack_url,
  settings.background_image,
  settings.gift_names,
  settings.family_signature
from auth.users as users
cross join public.invitation_settings as settings
where settings.id = 1
  and lower(users.email) <> 'freelas.jequie@gmail.com'
on conflict (owner_id) do nothing;

alter table public.rsvps
  add column if not exists invitation_id uuid references public.invitations(id) on delete cascade;

update public.rsvps
set invitation_id = (select id from public.invitations order by created_at limit 1)
where invitation_id is null
  and exists (select 1 from public.invitations);

do $$
begin
  if not exists (select 1 from public.rsvps where invitation_id is null) then
    alter table public.rsvps alter column invitation_id set not null;
  end if;
end $$;

create or replace function public.handle_invitation_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  child text;
  slug_base text;
begin
  insert into public.profiles (user_id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.email, ''))
  on conflict (user_id) do nothing;

  if lower(new.email) = 'freelas.jequie@gmail.com' then
    insert into public.platform_admins (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
    return new;
  end if;

  child := coalesce(nullif(trim(new.raw_user_meta_data ->> 'child_name'), ''), 'Meu convite');
  slug_base := trim(both '-' from lower(regexp_replace(child, '[^a-zA-Z0-9]+', '-', 'g')));
  if slug_base = '' then slug_base := 'convite'; end if;

  insert into public.invitations (
    owner_id, slug, child_name, age, headline, introduction, event_date,
    event_time, venue, address, attire, attire_note, max_guests,
    soundtrack_url, background_image, gift_names, family_signature
  ) values (
    new.id,
    slug_base || '-' || substring(replace(new.id::text, '-', ''), 1, 6),
    child,
    '1',
    'celebra uma nova idade!',
    'Você recebeu um convite muito especial. Venha celebrar com a gente!',
    'Defina a data da festa',
    'Defina o horário',
    'Defina o local',
    'Adicione o endereço completo',
    'Traje livre',
    'Venha como se sentir melhor',
    4,
    '',
    '/hero-ocean.png',
    array['Uma lembrança especial', 'Um livro divertido', 'Um brinquedo criativo'],
    'Com carinho, nossa família'
  )
  on conflict (owner_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_invitation_user_created on auth.users;
create trigger on_invitation_user_created
after insert on auth.users
for each row execute procedure public.handle_invitation_user_created();

alter table public.profiles enable row level security;
alter table public.platform_admins enable row level security;
alter table public.invitations enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.platform_admins from anon, authenticated;
revoke all on table public.invitations from anon, authenticated;

grant select, update on table public.profiles to authenticated;
grant select on table public.platform_admins to authenticated;
grant select on table public.invitations to anon, authenticated;
grant update on table public.invitations to authenticated;

drop policy if exists "Users can read own profile and platform admin can list" on public.profiles;
create policy "Users can read own profile and platform admin can list"
on public.profiles for select to authenticated
using (user_id = auth.uid() or (select public.is_platform_admin()));

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Platform admin can read own membership" on public.platform_admins;
create policy "Platform admin can read own membership"
on public.platform_admins for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Published invitations are public" on public.invitations;
create policy "Published invitations are public"
on public.invitations for select to anon
using (published = true);

drop policy if exists "Users read own invitation and published invitations" on public.invitations;
create policy "Users read own invitation and published invitations"
on public.invitations for select to authenticated
using (published = true or owner_id = auth.uid() or (select public.is_platform_admin()));

drop policy if exists "Users update own invitation" on public.invitations;
create policy "Users update own invitation"
on public.invitations for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Guests can submit RSVP" on public.rsvps;
drop policy if exists "Admin can read RSVP" on public.rsvps;
drop policy if exists "Admin can delete RSVP" on public.rsvps;
drop policy if exists "Guests can submit RSVP to published invitation" on public.rsvps;
drop policy if exists "Owners can read invitation RSVP" on public.rsvps;
drop policy if exists "Owners can delete invitation RSVP" on public.rsvps;

create policy "Guests can submit RSVP to published invitation"
on public.rsvps for insert to anon, authenticated
with check (
  invitation_id is not null
  and exists (
    select 1 from public.invitations
    where id = invitation_id
      and published = true
      and guests <= max_guests
  )
  and char_length(trim(name)) between 2 and 120
  and char_length(message) <= 500
);

create policy "Owners can read invitation RSVP"
on public.rsvps for select to authenticated
using (
  exists (
    select 1 from public.invitations
    where id = invitation_id and owner_id = auth.uid()
  )
);

create policy "Owners can delete invitation RSVP"
on public.rsvps for delete to authenticated
using (
  exists (
    select 1 from public.invitations
    where id = invitation_id and owner_id = auth.uid()
  )
);

drop policy if exists "Admin can upload invitation assets" on storage.objects;
drop policy if exists "Admin can update invitation assets" on storage.objects;
drop policy if exists "Admin can delete invitation assets" on storage.objects;
drop policy if exists "Owners can upload invitation assets" on storage.objects;
drop policy if exists "Owners can update invitation assets" on storage.objects;
drop policy if exists "Owners can delete invitation assets" on storage.objects;

create policy "Owners can upload invitation assets"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'invitation-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Owners can update invitation assets"
on storage.objects for update to authenticated
using (
  bucket_id = 'invitation-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'invitation-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Owners can delete invitation assets"
on storage.objects for delete to authenticated
using (
  bucket_id = 'invitation-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);
