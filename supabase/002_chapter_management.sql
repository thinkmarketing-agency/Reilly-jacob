-- Run once in Supabase SQL Editor. Preserves every photo and storage object.
begin;
create or replace function public.delete_family_chapter(chapter_id uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  moved integer;
begin
  if not public.is_family_admin() then
    raise exception 'Family administrator access required' using errcode = '42501';
  end if;
  -- Lock the destination so concurrent placement/deletion cannot lose photos.
  perform 1 from public.albums where id = chapter_id for update;
  if not found then
    raise exception 'Chapter no longer exists' using errcode = 'P0002';
  end if;
  update public.photos set album_id = null, published = false where album_id = chapter_id;
  get diagnostics moved = row_count;
  delete from public.albums where id = chapter_id;
  return moved;
end;
$$;
revoke all on function public.delete_family_chapter(uuid) from public, anon;
grant execute on function public.delete_family_chapter(uuid) to authenticated;
commit;
