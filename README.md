# Reilly & Jacob family album

This is the active project in the original repository. The old bulletin board, wedding registry page and sitemap have been retired. Existing photo files remain intact. Netlify publishes the repository root without a build, as specified in netlify.toml. The former registry URL redirects to the new homepage. Nothing has been pushed or deployed.

## Workflow

Both approved administrators have the same access from a phone or computer. Bulk uploads require no organization and go to a shared private inbox. Select photos, choose a chapter/collection, optionally add captions and tags, and press “Place & make live.” Returning photos to the inbox hides them again. Captions and tags can also be edited without changing placement. Chapters are freely named: Jamaica Wedding, Bend Wedding, Jamaica Week, Trafford, or anything else. Photos belong directly to chapters; there is no collection layer. The existing four destinations are retained and can be renamed. Holiday cards remain a separate future feature.

Both photo and destination visibility are enforced by database/storage policies. Private inbox files live in a private bucket. Visitor links expire in five minutes; an already issued link can work until then. Existing static photos used by the cover and Memories are public assets, independently of the Supabase inbox.

## Local preview

Run `python3 -m http.server 8765` in this repository, then visit http://localhost:8765 and http://localhost:8765/admin/ . Until configured, admin reports that Supabase is not connected.

## Supabase setup

1. Create a new, dedicated project at https://supabase.com/dashboard . Keep its database password private.
2. Run supabase/001_family_album.sql once in that project's SQL editor. It creates administrator membership, albums, photos, four destination collections and a private photo bucket, with access rules. It has not been applied remotely.
3. Disable “Allow new users to sign up” under Authentication settings. In Authentication → Users create two separate email/password users, one for Jacob and one for Reilly, using the dashboard's Create user option. Each needs a known password to use the current sign-in form. Invitation/password-setup and recovery screens are future work; do not send invitations until that flow is implemented.
4. Copy each Auth user's UUID. In the SQL editor add each to family_admins:

   insert into public.family_admins(user_id) values ('JACOB_AUTH_USER_UUID'), ('REILLY_AUTH_USER_UUID');

   Replace the quoted placeholders with the actual UUIDs. No browser user can grant administrator access.
5. Copy the project URL and publishable key from the project's Connect dialog into config.js. Never use a secret or service-role key in frontend files.
6. Sign in as each user and complete the checks below before deployment.

## Acceptance checks before release

- Upload several photos without choosing a destination. They must appear in the private inbox for both administrators, with null album_id and published=false.
- Use an anonymous client and an ordinary unapproved account. Both must be unable to write metadata or upload files. Neither may read inbox metadata, download known inbox object paths or generate links to them.
- Place selected photos into a chapter: they must become visible publicly. Captions/tags must persist. Return them to inbox: public queries must stop returning them and new signed-link requests must fail.
- Repeat on an iPhone and desktop. Check keyboard access, reduced motion, photo dialog close, unsupported files and partial-upload retry.
- Test an expired/revoked administrator session and sign-out.

## Current limits and verification

JavaScript syntax and original photo preservation have been checked. Browser preview is restricted in the execution environment. Live Supabase Auth, SQL and RLS checks require a configured project and have not run. No Netlify remote settings were accessible from the repository: verify its linked repository, branch, publish directory and custom domain before release.

Uploads currently accept JPEG, PNG and WebP up to 20 MB each. HEIC conversion, video, thumbnails, EXIF stripping, duplicate detection and pagination remain future work. Originals retain metadata; review them before making them live. Multi-select caption/tag saving replaces those fields on every selected photo, including empty fields.

No automatic deployment is performed. Once reviewed and tested, republishing through Netlify replaces the old experience.

## Chapter model update

The existing `albums` rows are now the chapters themselves. Their IDs and photo placements are preserved. The legacy `chapter` column remains populated for compatibility with the already-applied database constraint, but is not used for grouping or displayed. No new SQL or re-upload is needed for this update. Public chapter cards are loaded from database records, rather than fixed categories. Creating or renaming a chapter uses its freely chosen title. “Place / move & make live” assigns selected photos directly to the chosen chapter.

## Edit chapters

Each chapter now has its own name field, photo count, Save name and Delete chapter actions. Deletion requires a warning confirmation and calls an administrator-only database function. Run `supabase/002_chapter_management.sql` once in the Supabase SQL editor to enable it. The function locks the chapter, clears its photos' placement and publication, and deletes the chapter in a single transaction. It does not delete photos, tags, captions or storage objects. If any step fails, the entire operation rolls back.

Acceptance checks in a disposable chapter: rename and verify public title; cancel delete and verify no change; delete with both live and draft photos and verify all return to private inbox with their IDs, paths, tags and captions intact; verify anonymous and non-admin calls fail. The migration has been prepared but not applied or tested on the live database by the agent.

## Individual captions and tags

Bulk chapter assignment is separate from photo details. Open the main family album while signed in, open a photo and choose Edit caption & tags. Changes target that photo's ID only. Previous/Next controls let administrators work through a chapter. Public visitors and unapproved accounts do not receive editing controls; existing database RLS independently rejects their updates. Captions are displayed publicly; editing fields are private to administrators. No database migration is needed.

## Thumbnail framing and chapter covers

Run `supabase/003_photo_framing.sql` once to add focal coordinates and chapter cover choices. In the main site, open a photo → Edit photo details to adjust horizontal/vertical framing with two previews, then save. This changes CSS crop positioning, not original file bytes. The same framing is used for photo thumbnails and chapter covers; the full photo viewer remains uncropped. Use Set as chapter cover on any live photo in that chapter. Moving/unpublishing the chosen photo clears its cover selection on the server and the chapter falls back to another live photo. Existing RLS restricts writes to family admins; a database trigger validates cover membership. Migration prepared but not yet applied or integration-tested.

## Photo-led chapter browsing and search

The inside now features large photographic chapter cards, an immersive chapter cover and a photo wall. Empty chapters appear as a quiet “More stories to come” list instead of dominating the screen with placeholders. Only existing published photos and chapters are used. Search matches tags and captions across all published photos, ignores case, and requires all entered words to match. Real tags supply suggestion chips; photo-viewer tags link back to search. Empty searches return to browsing. No database migration is needed.

## Photo removal and permanent deletion

In the main album viewer, approved admins can Remove from chapter. This sets album_id=null and published=false on that single photo; its caption, tags, framing and file are retained. Existing cover cleanup triggers clear any cover pointing to it.

In the private inbox, select photos and choose Delete selected photos. A separate permanent-deletion warning must be confirmed. The database delete is guarded by both unpublished status and no chapter assignment, so concurrently placed photos are skipped. Only paths returned by that delete are removed from storage. Storage cleanup failures retain a browser-local retry queue and expose Retry file cleanup; orphaned files remain private. Database and object storage operations cannot share a transaction. A network disconnect after a committed database delete but before its response is received may require manual orphan cleanup. No SQL migration is required.

## Phone photo viewer

At phone widths, opening a photo shows an edge-to-edge viewer with the original uncropped photograph. Swipe left/right to navigate, swipe down to close, or tap to show caption, tags and navigation/admin tools. Controls start hidden; keyboard arrows and Escape still work. Editing tools use a scrollable overlay, and swiping is paused during editing or saving. Desktop keeps visible controls. Actual iPhone touch behavior still needs a device check. No SQL changes.

## Shuffled Little Moments

Little Moments now draws from all published photos in visible chapters. It starts with 12 shuffled photos and adds 12 more near the bottom (More moments is a keyboard-friendly fallback). Every photo appears once before the next shuffled cycle, with immediate repeats avoided between cycles when possible. The order is stable for this page visit and changes on refresh. Opening a stream photo uses that same growing order for desktop navigation or phone swipes; chapter galleries and tag-search results retain their own order. Rendering uses independent columns to append without reshuffling existing tiles. Published photo metadata is fetched in pages to avoid Supabase's default row cap. No SQL migration.

## Rotation and photo-only zoom

Phone/touch-device photo mode no longer depends solely on portrait width. The viewer uses the visual viewport and stays full screen across rotation. Pinch or double-tap zooms the photo (1–5×), one-finger dragging pans within its bounds, and navigation swipes resume at fit-to-screen zoom. Double-tap again or use Fit photo to screen in the revealed tools to reset. Rotation refits the same photo without changing its position in the sequence or source gallery. Input sizes and touch behavior reduce accidental iPhone page zoom without disabling browser accessibility zoom. Real-device iPhone pinch/rotation still require validation. No SQL changes.

## Automatic upload optimization

Apply `supabase/004_photo_optimization.sql` once. New uploads are decoded on the device and encoded as a JPEG view copy (up to 2560px long edge, targeting 850 KB) plus a thumbnail (up to 640px, targeting 100 KB). The encoder reduces quality/dimensions for large files, never enlarges image dimensions, and processes one photo at a time. Targets vary with image complexity; they are not hard quotas. Only those web-ready copies are uploaded. Blank captions remain blank. Originals on the user's device are untouched; the website is not an archive of full-resolution originals.

The admin Photo storage panel shows actual bucket file bytes and progress against a clearly labeled 1 GB free-plan reference (not an account-plan lookup). Optimize existing photos downloads one at a time, writes both new files, conditionally switches the existing photo record by its original path, and only then retires the old stored file. Metadata, photo IDs and chapter covers stay intact. If processing/upload fails, the existing reference remains unchanged. Concurrent replacement conflicts clean up newly uploaded files. Existing photos already smaller than the combined outputs are retained. Failed storage cleanup uses the existing retry queue. Running the optimizer again skips completed records and retries unfinished ones.

Thumbnails follow the same private storage policies as the full view copies; unpublished thumbnails cannot be signed or downloaded publicly. Permanent deletion now cleans up both variants. The migration adds no public bucket and makes no changes to existing file contents on its own.

## Thumbnail quality correction

Thumbnail v2 uses staged high-quality downsampling at up to 1280px long edge and JPEG quality .88–.80; it preserves preview dimensions rather than shrinking them to meet a small byte target. “Refresh thumbnail quality” rebuilds old previews from each retained viewing file, updates only thumbnail_path/thumbnail_bytes with concurrency guards, and then removes the superseded derived preview. It does not recompress viewing files or alter captions, tags, IDs, chapter placements or covers. Existing thumbnail records are rebuilt in place, so visitors receive the replacements after refreshing. No additional SQL is required.

## Unified landscape fitting

The photo viewer now uses the same fixed viewport surface at every screen size. The image box is explicitly sized from both natural image dimensions and the available viewport: min(viewport width / image width, viewport height / image height). Portrait images therefore get side margins in landscape, and landscape images get top/bottom margins in portrait. Device rotation refits the current photo at 1× and clears pan. Touch detection includes maxTouchPoints/any-pointer so an attached iPad trackpad does not switch the viewer into an old scrolling layout. Desktop uses the same fit surface with controls visible.
