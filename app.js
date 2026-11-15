import {backend,check,imageURL,installImageRefresh} from './api.js?v=2';
import {findPhotos,popularTags} from './search.js';
let chapters=[],photos=[];
let db=null,admin=false,currentPhoto=null,activePhotos=[],photoIndex=0,saving=false,covers=new Map(),activeChapter=null;
const $=s=>document.querySelector(s);
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
let opening=false;
function openAlbum(animate=true){
 if(opening)return;opening=true;
 if(animate)document.body.classList.add('opening');
 setTimeout(()=>{
  $('.entrance').hidden=true;$('#collection').hidden=false;document.body.classList.remove('opening');opening=false;
  if(location.hash!=='#collection')history.pushState(null,'','#collection');
  window.scrollTo(0,0);$('#collection').focus({preventScroll:true});
 },animate&&!reduced()?650:0);
}
function closeAlbum(){
 if(opening)return;
 $('#collection').hidden=true;$('.entrance').hidden=false;returnToChapters(false);
 if(location.hash)history.pushState(null,'',location.pathname+location.search);
 window.scrollTo(0,0);$('#open').focus({preventScroll:true});
}
$('#open').onclick=()=>openAlbum();$('#close').onclick=closeAlbum;
$('.skip').onclick=e=>{e.preventDefault();openAlbum(false)};
window.addEventListener('popstate',()=>{if(location.hash==='#collection')openAlbum(false);else closeAlbum()});
if(location.hash==='#collection')openAlbum(false);
function el(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node}
function chapterPhotos(id){return photos.filter(p=>p.chapter===id)}
function heroPhoto(id){const items=chapterPhotos(id);return items.find(p=>p.id===covers.get(id))||items[0]}
function render(){
 const grid=$('#chapters');grid.replaceChildren();$('#empty-chapters').replaceChildren();
 let populated=0,empty=0;
 for(const [id,title] of chapters){
  const items=chapterPhotos(id),hero=heroPhoto(id);
  if(!hero){empty++;const chip=el('button','upcoming-chapter',title+' ↗');chip.onclick=()=>show(id);$('#empty-chapters').append(chip);continue}
  const card=el('button','chapter');card.dataset.chapterId=id;card.setAttribute('aria-label',`Explore ${title}, ${items.length} ${items.length===1?'photo':'photos'}`);
  const image=el('img');image.dataset.photoPath=hero.path||'';image.src=hero.url;image.alt='';image.style.objectPosition=position(hero);image.loading=populated===0?'eager':'lazy';card.append(image);
  const copy=el('span','copy');copy.append(el('strong','',title),el('small','',`${items.length} ${items.length===1?'moment':'moments'} · Step inside`));
  card.append(copy,el('span','chapter-arrow','↗'));card.onclick=()=>show(id);grid.append(card);populated++;
 }
 grid.classList.toggle('single-chapter',populated===1);$('#upcoming').hidden=!empty;
 $('#recent').hidden=photos.length<2;
 if(photos.length>=2)photoWall($('#recent-photos'),photos.slice(-9).reverse());
 const suggestions=$('#tag-suggestions');suggestions.replaceChildren();
 for(const tag of popularTags(photos)){const button=el('button','tag-chip',tag);button.onclick=()=>searchFor(tag);suggestions.append(button)}
 applySearch();
}
function photoWall(container,items){container.classList.toggle('single-photo',items.length===1);container.replaceChildren();for(const photo of items){const button=el('button','moment');button.setAttribute('aria-label',photo.caption||'Open photo');const image=el('img');image.dataset.photoPath=photo.path||'';image.src=photo.url;image.alt=photo.caption||'Family memory';image.loading='lazy';image.style.objectPosition=position(photo);image.dataset.photoId=photo.id||'';button.append(image);if(photo.caption)button.append(el('span','moment-caption',photo.caption));button.onclick=()=>openPhoto(items,items.indexOf(photo));container.append(button)}}
function renderGallery(id){const chapter=chapters.find(c=>c[0]===id);if(!chapter)return;const items=chapterPhotos(id),hero=heroPhoto(id);$('#gallery-title').textContent=chapter[1];$('#gallery-note').textContent=items.length?`${items.length} ${items.length===1?'moment':'moments'} worth keeping.`:'The next story starts here.';$('#gallery-cover').hidden=!hero;$('.gallery-hero').classList.toggle('is-empty',!hero);if(hero){$('#gallery-cover').dataset.photoPath=hero.path||'';$('#gallery-cover').src=hero.url;$('#gallery-cover').style.objectPosition=position(hero)}photoWall($('#photos'),items)}
function show(id){activeChapter=id;$('#chapter-overview').hidden=true;$('#gallery').hidden=false;renderGallery(id);window.scrollTo({top:0,behavior:reduced()?'instant':'smooth'});$('#back').focus({preventScroll:true})}
function returnToChapters(focus=true){const previous=activeChapter;activeChapter=null;$('#gallery').hidden=true;$('#chapter-overview').hidden=false;if(focus){const card=[...$('#chapters').querySelectorAll('button')].find(b=>b.dataset.chapterId===previous);(card||$('#tag-search')).focus();}}
$('#back').onclick=()=>returnToChapters();$('#dismiss').onclick=()=>{if(discardEdits())$('#lightbox').close()};
function applySearch(){const query=$('#tag-search').value.trim();$('#browse').hidden=!!query;$('#search-results').hidden=!query;$('#clear-search').hidden=!query;$('#tag-suggestions').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.textContent.toLocaleLowerCase()===query.toLocaleLowerCase())));if(query){const matches=findPhotos(photos,query);$('#search-count').textContent=`${matches.length} ${matches.length===1?'photo':'photos'} matching “${query}”`;$('#search-empty').hidden=!!matches.length;photoWall($('#search-photos'),matches)}}
function searchFor(tag){$('#tag-search').value=tag;returnToChapters(false);applySearch();$('#tag-search').focus();$('#chapter-overview').scrollIntoView({behavior:reduced()?'instant':'smooth'})}
$('#tag-search').oninput=applySearch;$('#search-form').onsubmit=e=>{e.preventDefault();applySearch()};$('#clear-search').onclick=()=>{$('#tag-search').value='';applySearch();$('#tag-search').focus()};
function renderPhotoTags(){const container=$('#photo-tags');container.replaceChildren();for(const tag of currentPhoto.tags||[]){const button=el('button','tag-chip',tag);button.onclick=()=>{if(discardEdits()){$('#lightbox').close();searchFor(tag)}};container.append(button)}}
$('#collection-status').textContent='Opening the album…';
try{
 db=await backend();
 if(db){
  installImageRefresh(document,db);
  const albums=check(await db.from('albums').select('*').eq('published',true).order('created_at'));
  const rows=check(await db.from('photos').select('*').eq('published',true).order('created_at'));
  const visible=new Set(albums.map(a=>a.id));
  photos=await Promise.all(rows.filter(p=>visible.has(p.album_id)).map(async p=>({...p,chapter:p.album_id,url:await imageURL(db,p.path)})));
  chapters=albums.map(a=>[a.id,a.title]);covers=new Map(albums.map(a=>[a.id,a.cover_photo_id]));await checkAdmin();
 }else{
  chapters=[['local-memories','Memories']];photos=Array.from({length:15},(_,i)=>({caption:'Reilly & Jacob · Memory '+(i+1),url:`assets/images/jr${i+1}.jpeg`,chapter:'local-memories',tags:[]}));
 }
 $('#collection-status').textContent=photos.length?'':'Our next chapter is on its way.';render();
}catch(error){console.error('Published chapters unavailable',error);$('#collection-status').textContent='The album could not load. Please refresh to try again.'}

function dirty(){return !$('#photo-editor').hidden && currentPhoto && ($('#edit-caption').value!==currentPhoto.caption || $('#edit-tags').value!==(currentPhoto.tags||[]).join(', ') || Number($('#focal-x').value)!==(currentPhoto.focal_x??50) || Number($('#focal-y').value)!==(currentPhoto.focal_y??50))}
function discardEdits(){return !saving && (!dirty() || confirm('Discard your unsaved photo details?'))}
function displayPhoto(){
 currentPhoto=activePhotos[photoIndex];
 $('#lightbox img').dataset.photoPath=currentPhoto.path||'';$('#lightbox img').src=currentPhoto.url;$('#lightbox img').alt=currentPhoto.caption||'Family memory';
 $('#photo-caption').textContent=currentPhoto.caption;renderPhotoTags();
 $('#photo-status').textContent='';$('#photo-editor').hidden=true;
 $('#edit-photo').hidden=!admin||!currentPhoto.id;updateCoverButton();
 $('#previous-photo').disabled=photoIndex===0;$('#next-photo').disabled=photoIndex===activePhotos.length-1;
}
function openPhoto(items,index){activePhotos=items;photoIndex=index;displayPhoto();$('#lightbox').showModal()}
$('#previous-photo').onclick=()=>{if(photoIndex>0&&discardEdits()){photoIndex--;displayPhoto()}};
$('#next-photo').onclick=()=>{if(photoIndex<activePhotos.length-1&&discardEdits()){photoIndex++;displayPhoto()}};
$('#lightbox').addEventListener('cancel',e=>{if(!discardEdits())e.preventDefault()});
$('#edit-photo').onclick=()=>{if(!admin||!currentPhoto?.id)return;$('#edit-caption').value=currentPhoto.caption||'';$('#edit-tags').value=(currentPhoto.tags||[]).join(', ');$('#focal-x').value=currentPhoto.focal_x??50;$('#focal-y').value=currentPhoto.focal_y??50;$('#thumbnail-preview').src=currentPhoto.url;$('#cover-preview').src=currentPhoto.url;previewFrame();$('#photo-editor').hidden=false;$('#edit-photo').hidden=true;$('#edit-caption').focus()};
$('#cancel-edit').onclick=()=>{if(discardEdits()){$('#photo-editor').hidden=true;$('#edit-photo').hidden=!admin;$('#photo-status').textContent=''}};
async function checkAdmin(){
 admin=false;
 if(db){const result=await db.auth.getUser();if(result.data?.user){const role=await db.rpc('is_family_admin');admin=!role.error&&role.data===true}}
 updateCoverButton();
 $('#family-link').textContent=admin?'Manage photos ↗':'Family sign in ↗';
 if(!admin){$('#photo-editor').hidden=true;$('#edit-photo').hidden=true}
 else if(currentPhoto)$('#edit-photo').hidden=!$('#photo-editor').hidden;
}
$('#photo-editor').onsubmit=async e=>{
 e.preventDefault();if(saving||!currentPhoto?.id)return;
 saving=true;const target=currentPhoto;const controls=[...$('#lightbox').querySelectorAll('button,input,textarea')];controls.forEach(c=>c.disabled=true);
 try{
  await checkAdmin();if(!admin)throw Error('Please sign in with your family account before editing.');
  const values={caption:$('#edit-caption').value.trim(),tags:[...new Set($('#edit-tags').value.split(',').map(t=>t.trim()).filter(Boolean))]};
  if(Number($('#focal-x').value)!==(target.focal_x??50)||Number($('#focal-y').value)!==(target.focal_y??50)){values.focal_x=Number($('#focal-x').value);values.focal_y=Number($('#focal-y').value)}
  // Update exactly this photo. RLS independently enforces administrator membership.
  const rows=check(await db.from('photos').update(values).eq('id',target.id).select('*'));
  if(rows.length!==1)throw Error('This photo could not be updated. Refresh and try again.');
  Object.assign(target,rows[0]);render();if(activeChapter)renderGallery(activeChapter);renderPhotoTags();$('#photo-caption').textContent=target.caption;$('#lightbox img').alt=target.caption||'Family memory';
  $('#photo-editor').hidden=true;$('#edit-photo').hidden=false;$('#photo-status').textContent='Photo details saved.';
 }catch(error){$('#photo-status').textContent=(error.code==='PGRST204'?'Run 003_photo_framing.sql in Supabase to enable saved framing.':error.message)||'Could not save. Please try again.'}
 finally{saving=false;controls.forEach(c=>c.disabled=false);$('#previous-photo').disabled=photoIndex===0;$('#next-photo').disabled=photoIndex===activePhotos.length-1}
};
window.addEventListener('focus',()=>{if(!saving)checkAdmin().catch(()=>{admin=false;$('#photo-editor').hidden=true;$('#edit-photo').hidden=true})});
window.addEventListener('beforeunload',e=>{if(dirty()){e.preventDefault();e.returnValue=''}});

function position(photo){return `${photo.focal_x??50}% ${photo.focal_y??50}%`}
function previewFrame(){const value=`${$('#focal-x').value}% ${$('#focal-y').value}%`;$('#thumbnail-preview').style.objectPosition=value;$('#cover-preview').style.objectPosition=value}
$('#focal-x').oninput=previewFrame;$('#focal-y').oninput=previewFrame;
$('#reset-frame').onclick=()=>{$('#focal-x').value=50;$('#focal-y').value=50;previewFrame()};
function updateCoverButton(){const button=$('#set-cover');button.hidden=!admin||!currentPhoto?.id;button.textContent=currentPhoto&&covers.get(currentPhoto.chapter)===currentPhoto.id?'Current chapter cover':'Set as chapter cover'}
$('#set-cover').onclick=async()=>{
 if(saving||!currentPhoto?.id)return;if(dirty()){$('#photo-status').textContent='Save or cancel your photo edits before setting the cover.';return}
 saving=true;$('#set-cover').disabled=true;
 try{await checkAdmin();if(!admin)throw Error('Sign in with your family account to change the cover.');
 const updated=check(await db.from('albums').update({cover_photo_id:currentPhoto.id}).eq('id',currentPhoto.chapter).select('id'));
 if(updated.length!==1)throw Error('Chapter no longer available.');covers.set(currentPhoto.chapter,currentPhoto.id);render();if(activeChapter)renderGallery(activeChapter);updateCoverButton();$('#photo-status').textContent='Chapter cover updated.';
 }catch(error){$('#photo-status').textContent=error.code==='PGRST204'?'Run 003_photo_framing.sql in Supabase to enable chapter covers.':error.message}
 finally{saving=false;$('#set-cover').disabled=false}
};
