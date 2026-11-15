import {check} from './api.js?v=2';
export const FULL_EDGE=2560,THUMB_EDGE=1280;
export function fitDimensions(width,height,edge){if(!(width>0&&height>0))throw Error('This image has invalid dimensions.');const scale=Math.min(1,edge/Math.max(width,height));return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))}}
export function formatBytes(bytes){return bytes>=1024*1024?`${(bytes/1024/1024).toFixed(1)} MB`:`${Math.round(bytes/1024)} KB`}
export function imageHeaderSize(buffer){
 const view=new DataView(buffer),length=view.byteLength;if(length<24)return null;
 if(view.getUint32(0)===0x89504e47)return {width:view.getUint32(16),height:view.getUint32(20)};
 if(view.getUint16(0)!==0xffd8)return null;
 let offset=2,size=null,orientation=1;
 while(offset+4<length){
  if(view.getUint8(offset)!==255)break;let marker=view.getUint8(offset+1);offset+=2;if(marker===0xda||marker===0xd9)break;
  if(marker===0xd8||marker===1)continue;const segment=view.getUint16(offset);if(segment<2||offset+segment>length)break;
  if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)&&segment>=7)size={height:view.getUint16(offset+3),width:view.getUint16(offset+5)};
  if(marker===0xe1&&segment>16&&view.getUint32(offset+2)===0x45786966){try{const tiff=offset+8,little=view.getUint16(tiff)===0x4949,ifd=tiff+view.getUint32(tiff+4,little),count=view.getUint16(ifd,little);for(let i=0;i<count;i++){const entry=ifd+2+i*12;if(entry+12>offset+segment)break;if(view.getUint16(entry,little)===0x0112){orientation=view.getUint16(entry+8,little);break}}}catch{}}
  offset+=segment;
 }
 if(size&&orientation>=5&&orientation<=8)[size.width,size.height]=[size.height,size.width];return size;
}
async function decode(blob){
 const size=imageHeaderSize(await blob.slice(0,512*1024).arrayBuffer());if(size&&size.width*size.height>60000000)throw Error('This photo exceeds 60 megapixels. Export a smaller copy and retry.');
 if(typeof createImageBitmap==='function'){try{const dimensions=size?fitDimensions(size.width,size.height,FULL_EDGE):null;const bitmap=await createImageBitmap(blob,{imageOrientation:'from-image',...(dimensions?{resizeWidth:dimensions.width,resizeHeight:dimensions.height,resizeQuality:'high'}:{})});return {image:bitmap,width:bitmap.width,height:bitmap.height,close:()=>bitmap.close()}}catch{}}
 const url=URL.createObjectURL(blob),image=new Image();
 try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Could not read this photo. Use JPEG, PNG or WebP.'));image.src=url});return {image,width:image.naturalWidth,height:image.naturalHeight,close:()=>{image.src='';URL.revokeObjectURL(url)}}}catch(error){URL.revokeObjectURL(url);throw error}
}
function renderSmooth(source,width,height){
 // Reduce large images in stages to filter fine texture instead of aliasing it.
 let current=source.image,currentWidth=source.width,currentHeight=source.height,owned=null;
 while(currentWidth>width*2||currentHeight>height*2){
  const next=document.createElement('canvas');next.width=Math.max(width,Math.round(currentWidth/2));next.height=Math.max(height,Math.round(currentHeight/2));
  const context=next.getContext('2d');if(!context)throw Error('Photo processing is unavailable.');context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.drawImage(current,0,0,next.width,next.height);
  if(owned){owned.width=0;owned.height=0}owned=next;current=next;currentWidth=next.width;currentHeight=next.height;
 }
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const context=canvas.getContext('2d');if(!context)throw Error('Photo processing is unavailable.');context.fillStyle='#fff';context.fillRect(0,0,width,height);context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.drawImage(current,0,0,width,height);
 if(owned){owned.width=0;owned.height=0}return canvas;
}
async function encode(source,edge,targetBytes,thumbnail=false){
 let size=fitDimensions(source.width,source.height,edge),canvas;
 try{
  const qualities=thumbnail?[.88,.84,.80]:[.84,.77,.70,.67];
  for(let attempt=0;attempt<qualities.length;attempt++){
   if(canvas){canvas.width=0;canvas.height=0}canvas=renderSmooth(source,size.width,size.height);
   const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('Could not optimize this photo.')),'image/jpeg',qualities[attempt]));
   if(blob.size<=targetBytes||attempt===qualities.length-1)return {blob,...size};
   // Keep thumbnail resolution: byte targets must not force blurry small previews.
   if(!thumbnail&&attempt>=1)size=fitDimensions(size.width,size.height,Math.round(Math.max(size.width,size.height)*.85));
  }
 }finally{if(canvas){canvas.width=0;canvas.height=0}}
}
export async function prepareThumbnail(blob){const source=await decode(blob);try{return await encode(source,THUMB_EDGE,240*1024,true)}finally{source.close()}}
export async function preparePhoto(blob){
 if(!['image/jpeg','image/png','image/webp'].includes(blob.type))throw Error('Use JPEG, PNG or WebP photos.');
 if(blob.size>80*1024*1024)throw Error('Choose a photo up to 80 MB. The optimized files, not the original, are uploaded.');
 const source=await decode(blob);
 try{if(source.width*source.height>60000000)throw Error('This photo is too large to process safely. Choose a smaller export.');
  const full=await encode(source,FULL_EDGE,850*1024),thumbnail=await encode(source,THUMB_EDGE,240*1024,true);
  return {full,thumbnail,originalBytes:blob.size,totalBytes:full.blob.size+thumbnail.blob.size};
 }finally{source.close()}
}
export async function storePreparedPhoto(db,userId,prepared,existing=null,retire=async()=>{},newPhotoId=crypto.randomUUID()){
 const stamp=crypto.randomUUID(),path=`${userId}/${stamp}-view.jpg`,thumbnailPath=`${userId}/${stamp}-thumb-v2.jpg`,created=[];let metadataAttempted=false;
 const values={path,thumbnail_path:thumbnailPath,optimized_at:new Date().toISOString(),original_bytes:existing?.original_bytes??prepared.originalBytes,file_bytes:prepared.full.blob.size,thumbnail_bytes:prepared.thumbnail.blob.size,width:prepared.full.width,height:prepared.full.height};
 try{
  for(const [name,blob] of [[path,prepared.full.blob],[thumbnailPath,prepared.thumbnail.blob]]){check(await db.storage.from('family-photos').upload(name,blob,{contentType:'image/jpeg',upsert:false,cacheControl:'3600'}));created.push(name)}
  let result;metadataAttempted=true;
  if(existing)result=await db.from('photos').update(values).eq('id',existing.id).eq('path',existing.path).select('id');
  else result=await db.from('photos').insert({id:newPhotoId,...values,uploaded_by:userId,album_id:null,published:false,caption:''}).select('id');
  const rows=check(result);if(rows.length!==1)throw Error('This photo changed while processing. Please refresh and try again.');
 }catch(error){
  // A lost response does not prove the database write failed. Check the new
  // reference before deleting uploaded bytes; when unsure, keep both copies.
  let linked=false,knownUnlinked=!metadataAttempted;
  if(metadataAttempted){try{const current=check(await db.from('photos').select('path').eq('path',path));linked=current.some(row=>row.path===path);knownUnlinked=!linked}catch{knownUnlinked=false}}
  if(!linked){if(knownUnlinked&&created.length)await retire(created);throw error}
 }
 // Acknowledge the metadata switch before retiring old bytes. Never delete a
 // still-referenced original because encoding, uploading, or updating failed.
 if(existing)await retire([existing.path,existing.thumbnail_path].filter(Boolean));
 return values;
}

export async function repairPhotoThumbnail(db,userId,photo,retire=async()=>{}){
 const source=check(await db.storage.from('family-photos').download(photo.path));
 const thumbnail=await prepareThumbnail(source),path=`${userId}/${crypto.randomUUID()}-thumb-v2.jpg`;
 check(await db.storage.from('family-photos').upload(path,thumbnail.blob,{contentType:'image/jpeg',upsert:false,cacheControl:'3600'}));
 try{
  let update=db.from('photos').update({thumbnail_path:path,thumbnail_bytes:thumbnail.blob.size}).eq('id',photo.id).eq('path',photo.path);
  update=photo.thumbnail_path?update.eq('thumbnail_path',photo.thumbnail_path):update.is('thumbnail_path',null);
  const rows=check(await update.select('id'));if(rows.length!==1)throw Error('This photo changed during thumbnail repair. Refresh and try again.');
 }catch(error){
  let linked=false,knownUnlinked=false;
  try{const rows=check(await db.from('photos').select('thumbnail_path').eq('thumbnail_path',path));linked=rows.some(row=>row.thumbnail_path===path);knownUnlinked=!linked}catch{}
  if(!linked){if(knownUnlinked)await retire([path]);throw error}
 }
 // The large viewing file and all photo details remain unchanged.
 if(photo.thumbnail_path)await retire([photo.thumbnail_path]);return {path,bytes:thumbnail.blob.size};
}
