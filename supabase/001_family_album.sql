-- Apply once to a dedicated Supabase project. No shared passwords or service keys in the browser.
begin;
create table public.family_admins(user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.family_admins enable row level security;
revoke all on public.family_admins from anon, authenticated;
create function public.is_family_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.family_admins where user_id=(select auth.uid()));
$$;
revoke all on function public.is_family_admin() from public;
grant execute on function public.is_family_admin() to anon,authenticated;
create table public.albums(id uuid primary key default gen_random_uuid(),title text not null check(length(title) between 1 and 120),chapter text not null check(chapter in ('wedding','trafford','holidays','memories')),published boolean not null default false,created_at timestamptz not null default now());
insert into public.albums(title,chapter,published) values ('The wedding','wedding',true),('Trafford','trafford',true),('Holidays','holidays',true),('Memories','memories',true);
create table public.photos(id uuid primary key default gen_random_uuid(),album_id uuid references public.albums(id),path text unique not null,caption text not null default '' check(length(caption)<=500),tags text[] not null default '{}',published boolean not null default false,uploaded_by uuid not null references auth.users(id),created_at timestamptz not null default now(),constraint live_photo_has_destination check(not published or album_id is not null));
create index on public.photos(album_id);
alter table public.albums enable row level security;
alter table public.photos enable row level security;
grant select on public.albums,public.photos to anon;
grant select,insert,update,delete on public.albums,public.photos to authenticated;
create policy albums_read on public.albums for select to anon,authenticated using(published or public.is_family_admin());
create policy albums_manage on public.albums for all to authenticated using(public.is_family_admin()) with check(public.is_family_admin());
create policy photos_read on public.photos for select to anon,authenticated using(public.is_family_admin() or (published and exists(select 1 from public.albums a where a.id=album_id and a.published)));
create policy photos_manage on public.photos for all to authenticated using(public.is_family_admin()) with check(public.is_family_admin());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('family-photos','family-photos',false,20971520,array['image/jpeg','image/png','image/webp']);
create policy family_photo_read on storage.objects for select to anon,authenticated using(bucket_id='family-photos' and (public.is_family_admin() or exists(select 1 from public.photos p join public.albums a on a.id=p.album_id where p.path=name and p.published and a.published)));
create policy family_photo_insert on storage.objects for insert to authenticated with check(bucket_id='family-photos' and public.is_family_admin() and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy family_photo_delete on storage.objects for delete to authenticated using(bucket_id='family-photos' and public.is_family_admin());
commit;
