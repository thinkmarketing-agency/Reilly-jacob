import {layoutViewerImage} from './viewer-fit.js?v=12';
import {MomentStream,photoKey} from './moments.js?v=7';
import {swipeAction,clampZoom,clampPan} from './gestures.js?v=9';
import {photoCaption} from './captions.js?v=5';
import {returnPhotoToInbox} from './photo-actions.js?v=3';
import {backend,check,imageURL,installImageRefresh} from './api.js?v=2';
import {findPhotos,popularTags} from './search.js';
let chapters=[],photos=[];
let db=null,admin=false,currentPhoto=null,activePhotos=[],photoIndex=0,saving=false,covers=new Map(),activeChapter=null;
const $=s=>document.querySelector(s);
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
let opening=false;const momentStream=new MomentStream();let momentColumns=0,momentsRendered=0,activeSource='gallery';
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
 $('#recent').hidden=!photos.length;
 momentStream.sync(photos);if(photos.length)momentStream.ensure(Math.max(12,momentStream.items.length));renderMoments(true);
 const suggestions=$('#tag-suggestions');suggestions.replaceChildren();
 for(const tag of popularTags(photos)){const button=el('button','tag-chip',tag);button.onclick=()=>searchFor(tag);suggestions.append(button)}
 applySearch();
}
function photoWall(container,items){container.classList.toggle('single-photo',items.length===1);container.replaceChildren();for(const photo of items){const button=el('button','moment');button.setAttribute('aria-label',photo.caption||'Open photo');const image=el('img');image.dataset.photoPath=photo.thumbnail_path||photo.path||'';image.src=photo.thumbUrl||photo.url;image.alt=photo.caption||'Family memory';image.loading='lazy';image.style.objectPosition=position(photo);image.dataset.photoId=photo.id||'';button.append(image);if(photo.caption)button.append(el('span','moment-caption',photo.caption));button.onclick=()=>openPhoto(items,items.indexOf(photo));container.append(button)}}
function renderGallery(id){const chapter=chapters.find(c=>c[0]===id);if(!chapter)return;const items=chapterPhotos(id),hero=heroPhoto(id);$('#gallery-title').textContent=chapter[1];$('#gallery-note').textContent=items.length?`${items.length} ${items.length===1?'moment':'moments'} worth keeping.`:'The next story starts here.';$('#gallery-cover').hidden=!hero;$('.gallery-hero').classList.toggle('is-empty',!hero);if(hero){$('#gallery-cover').dataset.photoPath=hero.path||'';$('#gallery-cover').src=hero.url;$('#gallery-cover').style.objectPosition=position(hero)}photoWall($('#photos'),items)}
function show(id){activeChapter=id;$('#chapter-overview').hidden=true;$('#gallery').hidden=false;renderGallery(id);window.scrollTo({top:0,behavior:reduced()?'instant':'smooth'});$('#back').focus({preventScroll:true})}
function returnToChapters(focus=true){const previous=activeChapter;activeChapter=null;$('#gallery').hidden=true;$('#chapter-overview').hidden=false;if(focus){const card=[...$('#chapters').querySelectorAll('button')].find(b=>b.dataset.chapterId===previous);(card||$('#tag-search')).focus();}}
$('#back').onclick=()=>returnToChapters();$('#dismiss').onclick=()=>{if(discardEdits())$('#lightbox').close()};
function applySearch(){const query=$('#tag-search').value.trim();$('#browse').hidden=!!query;$('#search-results').hidden=!query;$('#clear-search').hidden=!query;$('#tag-suggestions').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.textContent.toLocaleLowerCase()===query.toLocaleLowerCase())));if(query){const matches=findPhotos(photos,query);$('#search-count').textContent=`${matches.length} ${matches.length===1?'photo':'photos'} matching “${query}”`;$('#search-empty').hidden=!!matches.length;photoWall($('#search-photos'),matches)}}
function searchFor(tag){$('#tag-search').value=tag;returnToChapters(false);applySearch();$('#tag-search').focus();$('#chapter-overview').scrollIntoView({behavior:reduced()?'instant':'smooth'})}
$('#tag-search').oninput=applySearch;$('#search-form').onsubmit=e=>{e.preventDefault();applySearch()};$('#clear-search').onclick=()=>{$('#tag-search').value='';applySearch();$('#tag-search').focus()};
function renderPhotoTags(){const container=$('#photo-tags');container.replaceChildren();for(const tag of currentPhoto.tags||[]){const button=el('button','tag-chip',tag);button.onclick=()=>{if(discardEdits()){$('#lightbox').close();searchFor(tag)}};container.append(button)}}
function renderMoments(reset=false){
 const count=matchMedia('(max-width:760px)').matches?2:3;
 const root=$('#recent-photos');
 if(reset||count!==momentColumns){root.replaceChildren();momentColumns=count;momentsRendered=0;for(let i=0;i<count;i++)root.append(el('div','moment-column'))}
 for(let index=momentsRendered;index<momentStream.items.length;index++){
  const photo=momentStream.items[index],button=el('button','moment');button.dataset.momentIndex=index;button.dataset.photoKey=photoKey(photo);button.setAttribute('aria-label',photo.caption||'Open photo');
  const image=el('img');image.dataset.photoPath=photo.thumbnail_path||photo.path||'';image.src=photo.thumbUrl||photo.url;image.alt=photo.caption||'Family memory';image.loading='lazy';image.style.objectPosition=position(photo);button.append(image);
  if(photo.caption)button.append(el('span','moment-caption',photo.caption));button.onclick=()=>openPhoto(momentStream.items,index,'moments');root.children[index%count].append(button);
 }
 momentsRendered=momentStream.items.length;
}
function moreMoments(){if(!photos.length)return;momentStream.ensure(momentStream.items.length+12);renderMoments();$('#moments-status').textContent=`${momentStream.items.length} shuffled moments ready to explore.`}
$('#more-moments').onclick=moreMoments;
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{
 if(entries.some(entry=>entry.isIntersecting)&&!$('#collection').hidden&&!$('#chapter-overview').hidden&&!$('#browse').hidden&&!$('#lightbox').open)moreMoments();
},{rootMargin:'500px 0px'});observer.observe($('#moments-sentinel'))}
window.addEventListener('resize',()=>{if(momentStream.items.length)renderMoments()});
$('#collection-status').textContent='Opening the album…';
try{
 db=await backend();
 if(db){
  installImageRefresh(document,db);
  const albums=check(await db.from('albums').select('*').eq('published',true).order('created_at'));
  const rows=[];for(let from=0;;from+=500){const page=check(await db.from('photos').select('*').eq('published',true).order('created_at').order('id').range(from,from+499));rows.push(...page);if(page.length<500)break}
  const visible=new Set(albums.map(a=>a.id));
  photos=await Promise.all(rows.filter(p=>visible.has(p.album_id)).map(async p=>({...p,caption:photoCaption(p.caption),chapter:p.album_id,url:await imageURL(db,p.path),thumbUrl:p.thumbnail_path?await imageURL(db,p.thumbnail_path):null})));
  chapters=albums.map(a=>[a.id,a.title]);covers=new Map(albums.map(a=>[a.id,a.cover_photo_id]));await checkAdmin();
 }else{
  chapters=[['local-memories','Memories']];photos=Array.from({length:15},(_,i)=>({caption:'Reilly & Jacob · Memory '+(i+1),url:`assets/images/jr${i+1}.jpeg`,chapter:'local-memories',tags:[]}));
 }
 $('#collection-status').textContent=photos.length?'':'Our next chapter is on its way.';render();
}catch(error){console.error('Published chapters unavailable',error);$('#collection-status').textContent='The album could not load. Please refresh to try again.'}

function dirty(){return !$('#photo-editor').hidden && currentPhoto && ($('#edit-caption').value!==currentPhoto.caption || $('#edit-tags').value!==(currentPhoto.tags||[]).join(', ') || Number($('#focal-x').value)!==(currentPhoto.focal_x??50) || Number($('#focal-y').value)!==(currentPhoto.focal_y??50))}
function discardEdits(){return !saving && (!dirty() || confirm('Discard your unsaved photo details?'))}
function displayPhoto(){
 if(activeSource==='moments'){momentStream.ensure(photoIndex+4);renderMoments()}currentPhoto=activePhotos[photoIndex];resetPhotoZoom();$('#viewer-count').textContent=activeSource==='moments'?`Moment ${photoIndex+1}`:`${photoIndex+1} / ${activePhotos.length}`;
 $('#viewer-image').dataset.photoPath=currentPhoto.path||'';$('#viewer-image').src=currentPhoto.url;$('#viewer-image').alt=currentPhoto.caption||'Family memory';
 $('#photo-caption').textContent=currentPhoto.caption;renderPhotoTags();
 $('#photo-status').textContent='';$('#photo-editor').hidden=true;
 $('#edit-photo').hidden=!admin||!currentPhoto.id;updateCoverButton();
 $('#previous-photo').disabled=photoIndex===0;$('#next-photo').disabled=activeSource!=='moments'&&photoIndex===activePhotos.length-1;
}
function openPhoto(items,index,source='gallery'){activeSource=source;activePhotos=items;photoIndex=index;displayPhoto();$('#lightbox').classList.remove('controls-visible');$('#lightbox').showModal();fitViewer();document.body.classList.add('viewer-open');if(phoneViewer())$('#viewer-stage').focus({preventScroll:true})}
$('#previous-photo').onclick=()=>navigatePhoto('previous');
$('#next-photo').onclick=()=>navigatePhoto('next');
$('#lightbox').addEventListener('cancel',e=>{if(!discardEdits())e.preventDefault()});
$('#edit-photo').onclick=()=>{if(!admin||!currentPhoto?.id)return;$('#edit-caption').value=currentPhoto.caption||'';$('#edit-tags').value=(currentPhoto.tags||[]).join(', ');$('#focal-x').value=currentPhoto.focal_x??50;$('#focal-y').value=currentPhoto.focal_y??50;$('#thumbnail-preview').src=currentPhoto.thumbUrl||currentPhoto.url;$('#cover-preview').src=$('#thumbnail-preview').src;previewFrame();$('#photo-editor').hidden=false;$('#edit-photo').hidden=true;$('#edit-caption').focus()};
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
  Object.assign(target,rows[0]);render();if(activeChapter)renderGallery(activeChapter);renderPhotoTags();$('#photo-caption').textContent=target.caption;$('#viewer-image').alt=target.caption||'Family memory';
  $('#photo-editor').hidden=true;$('#edit-photo').hidden=false;$('#photo-status').textContent='Photo details saved.';
 }catch(error){$('#photo-status').textContent=(error.code==='PGRST204'?'Run 003_photo_framing.sql in Supabase to enable saved framing.':error.message)||'Could not save. Please try again.'}
 finally{saving=false;controls.forEach(c=>c.disabled=false);$('#previous-photo').disabled=photoIndex===0;$('#next-photo').disabled=activeSource!=='moments'&&photoIndex===activePhotos.length-1}
};
window.addEventListener('focus',()=>{if(!saving)checkAdmin().catch(()=>{admin=false;$('#photo-editor').hidden=true;$('#edit-photo').hidden=true})});
window.addEventListener('beforeunload',e=>{if(dirty()){e.preventDefault();e.returnValue=''}});

function position(photo){return `${photo.focal_x??50}% ${photo.focal_y??50}%`}
function previewFrame(){const value=`${$('#focal-x').value}% ${$('#focal-y').value}%`;$('#thumbnail-preview').style.objectPosition=value;$('#cover-preview').style.objectPosition=value}
$('#focal-x').oninput=previewFrame;$('#focal-y').oninput=previewFrame;
$('#reset-frame').onclick=()=>{$('#focal-x').value=50;$('#focal-y').value=50;previewFrame()};
function updateCoverButton(){$('#remove-photo').hidden=!admin||!currentPhoto?.id;const button=$('#set-cover');button.hidden=!admin||!currentPhoto?.id;button.textContent=currentPhoto&&covers.get(currentPhoto.chapter)===currentPhoto.id?'Current chapter cover':'Set as chapter cover'}
$('#set-cover').onclick=async()=>{
 if(saving||!currentPhoto?.id)return;if(dirty()){$('#photo-status').textContent='Save or cancel your photo edits before setting the cover.';return}
 saving=true;$('#set-cover').disabled=true;
 try{await checkAdmin();if(!admin)throw Error('Sign in with your family account to change the cover.');
 const updated=check(await db.from('albums').update({cover_photo_id:currentPhoto.id}).eq('id',currentPhoto.chapter).select('id'));
 if(updated.length!==1)throw Error('Chapter no longer available.');covers.set(currentPhoto.chapter,currentPhoto.id);render();if(activeChapter)renderGallery(activeChapter);updateCoverButton();$('#photo-status').textContent='Chapter cover updated.';
 }catch(error){$('#photo-status').textContent=error.code==='PGRST204'?'Run 003_photo_framing.sql in Supabase to enable chapter covers.':error.message}
 finally{saving=false;$('#set-cover').disabled=false}
};

$('#remove-photo').onclick=async()=>{
 if(saving||!currentPhoto?.id||!discardEdits())return;
 if(!confirm('Remove this photo from its chapter? It will return to the private inbox with its caption and tags intact. No image file will be deleted.'))return;
 saving=true;const target=currentPhoto;const controls=[...$('#lightbox').querySelectorAll('button,input,textarea')];controls.forEach(control=>control.disabled=true);
 try{
  await checkAdmin();if(!admin)throw Error('Sign in with your family account to remove photos.');
  await returnPhotoToInbox(db,target.id);
  photos=photos.filter(photo=>photo.id!==target.id);
  for(const [chapter,id] of covers)if(id===target.id)covers.delete(chapter);
  $('#photo-editor').hidden=true;$('#lightbox').close();currentPhoto=null;activePhotos=[];
  render();if(activeChapter)renderGallery(activeChapter);
  const status=activeChapter?$('#gallery-note'):$('#collection-status');status.textContent='Photo returned to the private inbox. Its caption and tags are kept.';
  (activeChapter?$('#back'):$('#tag-search')).focus({preventScroll:true});
 }catch(error){$('#photo-status').textContent=error.message||'Could not remove the photo. Please try again.'}
 finally{saving=false;controls.forEach(control=>control.disabled=false);if(currentPhoto){$('#previous-photo').disabled=photoIndex===0;$('#next-photo').disabled=activeSource!=='moments'&&photoIndex===activePhotos.length-1}}
};


const phoneViewer=()=>navigator.maxTouchPoints>0||matchMedia('(max-width:760px), (any-pointer:coarse), (max-height:500px) and (max-width:1100px)').matches;
function navigatePhoto(direction){if(saving||!$('#photo-editor').hidden||photoZoom>1.02)return;if(activeSource==='moments'&&direction==='next'){momentStream.ensure(photoIndex+2);renderMoments()}const next=photoIndex+(direction==='next'?1:-1);if(next>=0&&next<activePhotos.length&&discardEdits()){photoIndex=next;displayPhoto()}}
let photoZoom=1,panX=0,panY=0,gesture=null,pinch=null,ignoreTap=false,lastTap=0,tapTimer=null;
const pointers=new Map();
function applyPhotoZoom(){
 const stage=$('#viewer-stage'),image=$('#viewer-image');
 const pan=layoutViewerImage(stage,image,photoZoom,panX,panY);panX=pan.x;panY=pan.y;
 $('#lightbox').classList.toggle('photo-zoomed',photoZoom>1.02);
 $('#reset-photo-zoom').hidden=photoZoom<=1.02;
}
function resetPhotoZoom(){photoZoom=1;panX=0;panY=0;pointers.clear();gesture=null;pinch=null;applyPhotoZoom()}
function togglePhotoZoom(){
 if(!phoneViewer()||saving||!$('#photo-editor').hidden)return;
 if(photoZoom>1.02)resetPhotoZoom();else{photoZoom=2.5;$('#lightbox').classList.remove('controls-visible');applyPhotoZoom()}
}
function touchPair(){const [a,b]=[...pointers.values()];return {distance:Math.hypot(a.x-b.x,a.y-b.y),x:(a.x+b.x)/2,y:(a.y+b.y)/2}}
function beginPinch(){const pair=touchPair(),rect=$('#viewer-stage').getBoundingClientRect();pinch={distance:Math.max(1,pair.distance),zoom:photoZoom,x:panX,y:panY,anchorX:pair.x-rect.left-rect.width/2,anchorY:pair.y-rect.top-rect.height/2};gesture=null;ignoreTap=true;clearTimeout(tapTimer);lastTap=0}
$('#viewer-stage').addEventListener('pointerdown',event=>{
 if(!phoneViewer()||saving||!$('#photo-editor').hidden)return;
 pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});event.currentTarget.setPointerCapture(event.pointerId);
 if(pointers.size===1){gesture={x:event.clientX,y:event.clientY,id:event.pointerId,panX,panY,zoom:photoZoom};ignoreTap=false}
 else if(pointers.size===2)beginPinch();
});
$('#viewer-stage').addEventListener('pointermove',event=>{
 if(!pointers.has(event.pointerId))return;
 pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
 if(pointers.size>=2&&pinch){
  const pair=touchPair(),rect=$('#viewer-stage').getBoundingClientRect();photoZoom=clampZoom(pinch.zoom*pair.distance/pinch.distance);
  const ratio=photoZoom/pinch.zoom;
  panX=pair.x-rect.left-rect.width/2-(pinch.anchorX-pinch.x)*ratio;
  panY=pair.y-rect.top-rect.height/2-(pinch.anchorY-pinch.y)*ratio;
  $('#lightbox').classList.remove('controls-visible');applyPhotoZoom();return;
 }
 if(gesture&&photoZoom>1.02){panX=gesture.panX+event.clientX-gesture.x;panY=gesture.panY+event.clientY-gesture.y;if(Math.abs(event.clientX-gesture.x)>8||Math.abs(event.clientY-gesture.y)>8)ignoreTap=true;applyPhotoZoom()}
});
$('#viewer-stage').addEventListener('pointerup',event=>{
 if(!pointers.has(event.pointerId))return;
 pointers.delete(event.pointerId);
 if(pinch){
  ignoreTap=true;
  if(pointers.size===1){const [id,point]=[...pointers.entries()][0];gesture={x:point.x,y:point.y,id,panX,panY,zoom:photoZoom}}else gesture=null;
  pinch=null;return;
 }
 if(!gesture||gesture.id!==event.pointerId)return;
 const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y,startedZoomed=gesture.zoom>1.02;gesture=null;
 ignoreTap=ignoreTap||Math.abs(dx)>12||Math.abs(dy)>12;
 if(startedZoomed||photoZoom>1.02)return;
 const action=swipeAction(dx,dy);
 if(action==='close'){if(discardEdits())$('#lightbox').close()}
 else if(action)navigatePhoto(action);
});
$('#viewer-stage').addEventListener('pointercancel',()=>{pointers.clear();gesture=null;pinch=null;ignoreTap=true});
$('#viewer-stage').addEventListener('click',()=>{
 if(!phoneViewer()||saving||!$('#photo-editor').hidden)return;
 if(ignoreTap){ignoreTap=false;return}
 const now=Date.now();
 if(now-lastTap<300){clearTimeout(tapTimer);lastTap=0;togglePhotoZoom()}
 else{lastTap=now;clearTimeout(tapTimer);tapTimer=setTimeout(()=>{if($('#lightbox').open)$('#lightbox').classList.toggle('controls-visible')},300)}
});
$('#viewer-stage').addEventListener('dblclick',event=>event.preventDefault());
$('#reset-photo-zoom').onclick=resetPhotoZoom;
$('#viewer-image').addEventListener('load',applyPhotoZoom);
$('#lightbox').addEventListener('keydown',event=>{
 if(/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)||!$('#photo-editor').hidden)return;
 if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();navigatePhoto(event.key==='ArrowRight'?'next':'previous')}
 if(event.key===' '&&event.target===$('#viewer-stage')){event.preventDefault();$('#lightbox').classList.toggle('controls-visible')}
 if(event.key==='0')resetPhotoZoom();
});
$('#lightbox').addEventListener('close',()=>{document.body.classList.remove('viewer-open');clearTimeout(tapTimer);resetPhotoZoom()});
let orientationKey=`${screen.orientation?.type||''}:${innerWidth>innerHeight}`;
function fitViewer(){
 const viewport=window.visualViewport,dialog=$('#lightbox');dialog.classList.toggle('immersive-viewer',phoneViewer());
 dialog.style.setProperty('--viewer-height',`${viewport?.height||innerHeight}px`);
 dialog.style.setProperty('--viewer-width',`${viewport?.width||innerWidth}px`);
 dialog.style.setProperty('--viewer-top',`${viewport?.offsetTop||0}px`);dialog.style.setProperty('--viewer-left',`${viewport?.offsetLeft||0}px`);
 const nextKey=`${screen.orientation?.type||''}:${innerWidth>innerHeight}`;
 if(nextKey!==orientationKey){orientationKey=nextKey;if(dialog.open)resetPhotoZoom()}
 if(!phoneViewer()&&photoZoom>1)resetPhotoZoom();else applyPhotoZoom();
}
function refitAfterRotation(){clearTimeout(tapTimer);lastTap=0;if($('#lightbox').open)resetPhotoZoom();fitViewer();requestAnimationFrame(()=>requestAnimationFrame(fitViewer))}
window.addEventListener('resize',fitViewer);window.addEventListener('orientationchange',refitAfterRotation);screen.orientation?.addEventListener('change',refitAfterRotation);window.visualViewport?.addEventListener('resize',fitViewer);window.visualViewport?.addEventListener('scroll',fitViewer);fitViewer();
