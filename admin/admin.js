import {preparePhoto,storePreparedPhoto,formatBytes} from '/image-optimization.js?v=10';
import {photoCaption} from '/captions.js?v=5';
import {deleteInboxRecords,removeStoredFiles} from '/photo-actions.js?v=10';
import {backend,check,imageURL,installImageRefresh} from '/api.js?v=2';
const $=s=>document.querySelector(s);let db,user;let busy=false;let pendingChapter=null;let pendingPhotoIds=[];const pendingFiles=new Set();const cleanupKey='family-photo-cleanup-v1';
try{for(const path of JSON.parse(localStorage.getItem(cleanupKey)||'[]'))if(typeof path==='string')pendingFiles.add(path)}catch{}
const message=s=>$('#status').textContent=s;
async function task(fn){if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn()}catch(e){message(e.message||'Something went wrong. Please try again.')}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false)}}
async function refresh(){const albums=check(await db.from('albums').select('*').order('created_at'));const previous=$('#album').value;$('#album').replaceChildren();const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choose a destination…';$('#album').append(placeholder);for(const a of albums){const o=document.createElement('option');o.value=a.id;o.textContent=a.title;$('#album').append(o)}if(albums.some(a=>a.id===previous))$('#album').value=previous;const rows=[];for(let from=0;;from+=500){const page=check(await db.from('photos').select('*').order('created_at',{ascending:false}).order('id').range(from,from+499));rows.push(...page);if(page.length<500)break}await storageSummary(rows);renderChapters(albums,rows);$('#select-all-photos').hidden=$('#filter').value!=='inbox';$('#clear-selection').hidden=$('#filter').value!=='inbox';$('#selection-count').hidden=$('#filter').value!=='inbox';$('#delete-photos').hidden=$('#filter').value!=='inbox';$('#inbox-delete-note').hidden=$('#filter').value!=='inbox';$('#retry-cleanup').hidden=!pendingFiles.size;$('#counts').textContent=`${rows.filter(r=>!r.published).length} in inbox · ${rows.filter(r=>r.published).length} live`;$('#library').replaceChildren();for(const row of rows.filter(r=>$('#filter').value==='all'||($('#filter').value==='live'?r.published:!r.published))){const card=document.createElement('article');card.className='photo';const im=document.createElement('img');im.dataset.photoPath=row.thumbnail_path||row.path;im.src=await imageURL(db,row.thumbnail_path||row.path);im.alt=photoCaption(row.caption)||'Uploaded family photo';im.loading='lazy';const label=document.createElement('label');const input=document.createElement('input');input.type='checkbox';input.value=row.id;label.append(input,document.createTextNode((photoCaption(row.caption)||'Untitled')+' · '+(row.published?'Live':'Private inbox')));const location=document.createElement('p');const album=albums.find(a=>a.id===row.album_id);location.textContent=album?album.title:'Private inbox · No chapter assigned';card.append(location);const tags=document.createElement('p');tags.textContent=(row.tags||[]).join(', ');card.append(im,label,tags);$('#library').append(card)}updateSelectionCount()}
async function session(){const result=await db.auth.getUser();user=result.data?.user;$('#login').hidden=!!user;$('#workspace').hidden=true;$('#logout').hidden=!user;if(!user){message('Sign in to upload and organize your photos.');return}if(!check(await db.rpc('is_family_admin'))){message('This account has not been given family administrator access.');return}$('#workspace').hidden=false;await refresh();message('Upload to your private inbox. Place selected photos into a chapter when they are ready to go live.')}
$('#login').onsubmit=e=>{e.preventDefault();task(async()=>{check(await db.auth.signInWithPassword({email:$('#email').value,password:$('#password').value}));$('#password').value='';await session()})};
$('#logout').onclick=()=>task(async()=>{check(await db.auth.signOut());$('#delete-inbox').close();pendingPhotoIds=[];$('#library').replaceChildren();await session()});
$('#new-album').onsubmit=e=>{e.preventDefault();task(async()=>{check(await db.from('albums').insert({title:$('#album-name').value.trim(),chapter:'memories',published:true}));$('#album-name').value='';await refresh();message('Chapter created.')})};
async function requireOptimizationSetup(){const probe=await db.from('photos').select('thumbnail_path').limit(1);if(probe.error)throw Error('Run 004_photo_optimization.sql in Supabase first, then refresh this page. Uploads are paused so originals are not stored at full size.')}
async function retireFiles(paths){for(const path of paths)pendingFiles.add(path);saveCleanupQueue();try{await cleanupFiles()}catch{/* Keep the retry queue; never roll back a successful photo replacement. */}}
async function storageSummary(rows){
 const usage=await db.rpc('family_storage_usage');
 if(usage.error){$('#storage-usage').textContent='Run 004_photo_optimization.sql to enable automatic optimization and storage usage.';$('#storage-meter').hidden=true;return}
 const bytes=Number(usage.data.bytes)||0;$('#storage-usage').textContent=`${formatBytes(bytes)} used for photo files`;
 $('#storage-meter').hidden=false;$('#storage-meter').value=bytes;
 const saved=rows.reduce((total,row)=>total+Math.max(0,(row.original_bytes||0)-(row.file_bytes||0)-(row.thumbnail_bytes||0)),0);
 const remaining=rows.filter(row=>!row.optimized_at).length;
 $('#storage-details').textContent=`Compared with the 1 GB free-plan allowance. ${remaining} existing photos not yet optimized.`+(saved?` Web copies save about ${formatBytes(saved)} versus their originals.`:'')+(pendingFiles.size?' File cleanup is pending; use Retry file cleanup.':'');
}
$('#upload').onclick=()=>task(async()=>{
 const files=[...$('#files').files];if(!files.length)throw Error('Choose photos first.');await requireOptimizationSetup();
 const failures=[];let count=0,before=0,after=0;
 for(const file of files){try{
  message(`Optimizing ${count+failures.length+1} of ${files.length}…`);
  const prepared=await preparePhoto(file);await storePreparedPhoto(db,user.id,prepared,null,retireFiles);
  count++;before+=prepared.originalBytes;after+=prepared.totalBytes;
 }catch(error){failures.push(`${file.name}: ${error.message}`)}}
 await refresh();message(`${count} photos uploaded to the private inbox. ${formatBytes(before)} became ${formatBytes(after)}, including thumbnails.`+(failures.length?'\nFailed (select these files again to retry):\n'+failures.join('\n'):''));$('#files').value='';
});
$('#optimize-existing').onclick=()=>task(async()=>{
 await requireOptimizationSetup();
 if(!confirm('Optimize the existing photos for the website? Captions, tags, chapter placements and covers stay intact. Larger stored originals will be replaced with smaller web copies after successful processing. Keep your original photos on your own device.'))return;
 const rows=[];for(let from=0;;from+=500){const page=check(await db.from('photos').select('*').is('optimized_at',null).order('created_at').order('id').range(from,from+499));rows.push(...page);if(page.length<500)break}
 let count=0,skipped=0,saved=0;const failures=[];
 for(const photo of rows){try{
  message(`Optimizing existing photo ${count+skipped+failures.length+1} of ${rows.length}… Keep this page open.`);
  const blob=check(await db.storage.from('family-photos').download(photo.path));const prepared=await preparePhoto(blob);
  if(prepared.totalBytes>=blob.size){check(await db.from('photos').update({optimized_at:new Date().toISOString(),original_bytes:blob.size,file_bytes:blob.size,thumbnail_bytes:0}).eq('id',photo.id).eq('path',photo.path));skipped++;continue}
  await storePreparedPhoto(db,user.id,prepared,photo,retireFiles);saved+=blob.size-prepared.totalBytes;count++;
 }catch(error){failures.push(`${photoCaption(photo.caption)||'Photo'}: ${error.message}`)}}
 await refresh();message(`${count} existing photos optimized; ${skipped} already small and kept. About ${formatBytes(saved)} saved.`+(failures.length?'\nSome photos could not be processed; their originals are unchanged. Run again to retry.\n'+failures.join('\n'):''));
});
function ids(){const values=[...document.querySelectorAll('#library input:checked')].map(i=>i.value);if(!values.length)throw Error('Select at least one photo.');return values}
function destination(){const value=$('#album').value;if(!value)throw Error('Choose a destination chapter first.');return value}
async function update(values,notice='Selected photos updated.'){check(await db.from('photos').update(values).in('id',ids()));await refresh();message(notice)}
$('#publish').onclick=()=>task(()=>update({published:true,album_id:destination()},'Selected photos placed and made live.'));$('#unpublish').onclick=()=>task(()=>update({published:false,album_id:null}));
function renderChapters(albums,photos){
 const list=$('#chapter-list');list.replaceChildren();
 for(const album of albums){
  const row=document.createElement('div');row.className='chapter-editor';
  const label=document.createElement('label');label.textContent='Chapter name';
  const input=document.createElement('input');input.value=album.title;input.maxLength=120;input.required=true;input.setAttribute('aria-label',`Rename ${album.title}`);label.append(input);
  const count=document.createElement('span');const members=photos.filter(p=>p.album_id===album.id);count.textContent=`${members.length} photos · ${members.filter(p=>p.published).length} live`;
  const save=document.createElement('button');save.textContent='Save name';save.onclick=()=>task(async()=>{const title=input.value.trim();if(!title)throw Error('Enter a chapter name.');const updated=check(await db.from('albums').update({title}).eq('id',album.id).select('id'));if(!updated.length)throw Error('This chapter is no longer available. Refresh and try again.');await refresh();message('Chapter renamed. Its photos stay in place.')});
  const remove=document.createElement('button');remove.textContent='Delete chapter';remove.className='danger';remove.onclick=()=>{pendingChapter=album;$('#delete-description').textContent=`“${album.title}” currently contains ${members.length} photos (${members.filter(p=>p.published).length} live). Any photos added before deletion will also return to the inbox.`;$('#delete-error').textContent='';$('#delete-chapter').showModal()};
  row.append(label,count,save,remove);list.append(row);
 }
}
$('#cancel-delete').onclick=()=>$('#delete-chapter').close();
$('#confirm-delete').onclick=()=>task(async()=>{
 if(!pendingChapter)return;
 // The server function moves all photos and deletes the chapter in one transaction.
 const result=await db.rpc('delete_family_chapter',{chapter_id:pendingChapter.id});
 if(result.error){$('#delete-error').textContent=result.error.code==='PGRST202'?'Chapter deletion needs the one-time database update. Run 002_chapter_management.sql in Supabase, then try again.':result.error.message;return;}
 const title=pendingChapter.title;pendingChapter=null;$('#delete-chapter').close();await refresh();message(`“${title}” deleted. ${result.data} photos returned to the private inbox.`);
});
function saveCleanupQueue(){try{localStorage.setItem(cleanupKey,JSON.stringify([...pendingFiles]))}catch{/* Retry remains available in this tab. */}$('#retry-cleanup').hidden=!pendingFiles.size}
async function cleanupFiles(){const paths=[...pendingFiles];await removeStoredFiles(db,paths);for(const path of paths)pendingFiles.delete(path);saveCleanupQueue()}
$('#delete-photos').onclick=()=>{try{if(busy)return;if($('#filter').value!=='inbox')throw Error('Switch to the private inbox before deleting photos.');pendingPhotoIds=ids();$('#delete-inbox-description').textContent=`You selected ${pendingPhotoIds.length} ${pendingPhotoIds.length===1?'photo':'photos'}. Photos that have since been placed into a chapter will be kept.`;$('#delete-inbox-error').textContent='';$('#delete-inbox').showModal()}catch(error){message(error.message)}};
$('#keep-photos').onclick=()=>$('#delete-inbox').close();
$('#delete-inbox').addEventListener('cancel',event=>{if(busy)event.preventDefault()});
$('#confirm-delete-photos').onclick=()=>task(async()=>{
 try{
  const selectedCount=pendingPhotoIds.length;
  const removed=await deleteInboxRecords(db,pendingPhotoIds);
  // Remove database rows before files. Only paths returned by the guarded
  // delete are eligible for cleanup, so a concurrently published photo is safe.
  for(const photo of removed)for(const path of [photo.path,photo.thumbnail_path].filter(Boolean))pendingFiles.add(path);saveCleanupQueue();
  let cleanupFailed=false;try{await cleanupFiles()}catch{cleanupFailed=true}
  pendingPhotoIds=[];$('#delete-inbox').close();await refresh();
  message(`${removed.length} photos deleted. ${selectedCount-removed.length} kept because they were moved or no longer in the inbox.`+(cleanupFailed?' File cleanup could not finish. Tap “Retry file cleanup”; the remaining files are still private.':''));
 }catch(error){$('#delete-inbox-error').textContent=error.message||'Could not delete photos. Please try again.'}
});
$('#retry-cleanup').onclick=()=>task(async()=>{await cleanupFiles();message('Deleted photo files cleaned up.')});
$('#filter').onchange=()=>task(refresh);
try{db=await backend();if(!db)message('Local preview: Supabase is not connected yet. Account access and uploads will be available after setup.');else {installImageRefresh(document,db);await task(session)}}catch(e){message(e.message)}

function updateSelectionCount(){const inputs=[...document.querySelectorAll('#library input[type=checkbox]')];const count=inputs.filter(input=>input.checked).length;$('#selection-count').textContent=`${count} of ${inputs.length} selected`}
$('#select-all-photos').onclick=()=>{if(busy||$('#filter').value!=='inbox')return;document.querySelectorAll('#library input[type=checkbox]').forEach(input=>input.checked=true);updateSelectionCount()};
$('#clear-selection').onclick=()=>{if(busy)return;document.querySelectorAll('#library input[type=checkbox]').forEach(input=>input.checked=false);updateSelectionCount()};
$('#library').addEventListener('change',updateSelectionCount);
