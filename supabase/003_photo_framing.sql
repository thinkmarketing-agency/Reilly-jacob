-- Adds saved thumbnail framing and chapter cover selection. No photo files change.
begin;
alter table public.photos add column if not exists focal_x integer not null default 50 check(focal_x between 0 and 100);
alter table public.photos add column if not exists focal_y integer not null default 50 check(focal_y between 0 and 100);
alter table public.albums add column if not exists cover_photo_id uuid references public.photos(id) on delete set null;
create or replace function public.validate_chapter_cover() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
 if new.cover_photo_id is not null and (tg_op = 'INSERT' or new.cover_photo_id is distinct from old.cover_photo_id) then
  if not exists(select 1 from public.photos where id=new.cover_photo_id and album_id=new.id and published) then
   raise exception 'Choose a live photo in this chapter as its cover';
  end if;
 end if;
 return new;
end;
$$;
drop trigger if exists validate_chapter_cover on public.albums;
create trigger validate_chapter_cover before insert or update of cover_photo_id on public.albums for each row execute function public.validate_chapter_cover();
-- Clear the cover automatically if its photo is moved or returned to the inbox.
create or replace function public.clear_unplaced_cover() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
 if new.album_id is distinct from old.album_id or not new.published then
  update public.albums set cover_photo_id=null where cover_photo_id=new.id;
 end if;
 return new;
end;
$$;
drop trigger if exists clear_unplaced_cover on public.photos;
create trigger clear_unplaced_cover after update of album_id,published on public.photos for each row execute function public.clear_unplaced_cover();
commit;
