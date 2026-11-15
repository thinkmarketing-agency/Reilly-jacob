-- Run once in Supabase SQL Editor. Existing photos are unchanged by this setup.
begin;
alter table public.photos add column if not exists thumbnail_path text;
alter table public.photos add column if not exists optimized_at timestamptz;
alter table public.photos add column if not exists original_bytes bigint check(original_bytes>=0);
alter table public.photos add column if not exists file_bytes bigint check(file_bytes>=0);
alter table public.photos add column if not exists thumbnail_bytes bigint check(thumbnail_bytes>=0);
alter table public.photos add column if not exists width integer check(width>0);
alter table public.photos add column if not exists height integer check(height>0);
create unique index if not exists photos_thumbnail_path_unique on public.photos(thumbnail_path) where thumbnail_path is not null;
drop policy if exists family_photo_read on storage.objects;
create policy family_photo_read on storage.objects for select to anon,authenticated using(
 bucket_id='family-photos' and (public.is_family_admin() or exists(
  select 1 from public.photos p join public.albums a on a.id=p.album_id
  where (p.path=name or p.thumbnail_path=name) and p.published and a.published
 ))
);
create or replace function public.family_storage_usage() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_family_admin() then raise exception 'Family administrator access required' using errcode='42501';end if;
 return (select jsonb_build_object('bytes',coalesce(sum((metadata->>'size')::bigint),0),'files',count(*)) from storage.objects where bucket_id='family-photos');
end;
$$;
revoke all on function public.family_storage_usage() from public,anon;
grant execute on function public.family_storage_usage() to authenticated;
commit;
