-- 技能包只允许其上传者写入自己的目录，目录与前端路径保持一致：
-- packages/skills/<auth.uid()>/<uuid>-<filename>
-- 已有对象不受影响；公开读取继续支持所有用户下载已发布的 Skill。

drop policy if exists "packages authenticated upload" on storage.objects;
drop policy if exists "packages skill owner upload" on storage.objects;

create policy "packages skill owner upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'packages'
    and name like ('skills/' || auth.uid()::text || '/%')
  );

-- Agent 上传沿用既有 agents/ 路径，避免此次 Skill 权限调整影响已上线功能。
drop policy if exists "packages agent upload compatibility" on storage.objects;
create policy "packages agent upload compatibility" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'packages' and name like 'agents/%');

drop policy if exists "packages owner delete" on storage.objects;
drop policy if exists "packages owner delete skill package" on storage.objects;

create policy "packages owner delete skill package" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'packages'
    and owner = auth.uid()
    and name like ('skills/' || auth.uid()::text || '/%')
  );

drop policy if exists "packages owner delete agent package" on storage.objects;
create policy "packages owner delete agent package" on storage.objects
  for delete to authenticated
  using (bucket_id = 'packages' and owner = auth.uid() and name like 'agents/%');
