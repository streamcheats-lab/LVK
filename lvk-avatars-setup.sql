-- Run ONCE in Supabase SQL Editor before uploading profile pictures.
-- Public avatars: everyone can view, only the owner can change their own.
create table if not exists public.lvk_avatars (
 user_id uuid primary key references auth.users(id) on delete cascade,
 avatar_path text not null,
 updated_at timestamptz not null default now()
);
alter table public.lvk_avatars enable row level security;
drop policy if exists "lvk avatars view" on public.lvk_avatars;
create policy "lvk avatars view" on public.lvk_avatars for select to authenticated using (true);
drop policy if exists "lvk avatars insert" on public.lvk_avatars;
create policy "lvk avatars insert" on public.lvk_avatars for insert to authenticated with check (auth.uid()=user_id);
drop policy if exists "lvk avatars update" on public.lvk_avatars;
create policy "lvk avatars update" on public.lvk_avatars for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists "lvk avatars delete" on public.lvk_avatars;
create policy "lvk avatars delete" on public.lvk_avatars for delete to authenticated using (auth.uid()=user_id);
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
 values ('lvk-avatars','lvk-avatars',true,2097152,array['image/jpeg','image/png','image/webp'])
 on conflict(id) do update set public=true,file_size_limit=2097152,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "lvk avatar upload own" on storage.objects;
create policy "lvk avatar upload own" on storage.objects for insert to authenticated
 with check(bucket_id='lvk-avatars' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "lvk avatar delete own" on storage.objects;
create policy "lvk avatar delete own" on storage.objects for delete to authenticated
 using(bucket_id='lvk-avatars' and (storage.foldername(name))[1]=auth.uid()::text);
