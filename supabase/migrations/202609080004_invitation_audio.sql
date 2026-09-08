-- Upload de trilha sonora por responsável e registro da declaração de direitos.

alter table public.invitations
  add column if not exists soundtrack_rights_confirmed boolean not null default false;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'invitation-audio',
  'invitation-audio',
  true,
  20971520,
  array[
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/x-m4a',
    'audio/ogg',
    'audio/wav',
    'audio/x-wav',
    'audio/webm'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Owners can upload invitation audio" on storage.objects;
create policy "Owners can upload invitation audio"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'invitation-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Owners can update invitation audio" on storage.objects;
create policy "Owners can update invitation audio"
on storage.objects for update to authenticated
using (
  bucket_id = 'invitation-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'invitation-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Owners can delete invitation audio" on storage.objects;
create policy "Owners can delete invitation audio"
on storage.objects for delete to authenticated
using (
  bucket_id = 'invitation-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);
