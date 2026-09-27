-- Public post media is isolated from the Skill package buckets. Object keys are
-- scoped to the authenticated uploader: forum-attachments/<auth.uid()>/<uuid>.<ext>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'forum-attachments',
  'forum-attachments',
  true,
  6291456,
  array[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'text/markdown', 'text/csv', 'application/json', 'application/zip',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "forum attachments upload own files" on storage.objects;
create policy "forum attachments upload own files" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'forum-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "forum attachments delete own files" on storage.objects;
create policy "forum attachments delete own files" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'forum-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
