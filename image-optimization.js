import {check} from './api.js?v=2';
export const FULL_EDGE=2560,THUMB_EDGE=640;
export function fitDimensions(width,height,edge){if(!(width>0&&height>0))throw Error('This image has invalid dimensions.');const scale=Math.min(1,edge/Math.max(width,height));return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))}}
export function formatBytes(bytes){return bytes>=1024*1024?`${(bytes/1024/1024).toFixed(1)} MB`:`${Math.round(bytes/1024)} KB`}
async function decode(blob){
 if(typeof createImageBitmap==='function'){try{const bitmap=await createImageBitmap(blob,{imageOrientation:'from-image'});return {image:bitmap,width:bitmap.width,height:bitmap.height,close:()=>bitmap.close()}}catch{}}
 const url=URL.createObjectURL(blob),image=new Image();
 try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Could not read this photo. Use JPEG, PNG or WebP.'));image.src=url});return {image,width:image.naturalWidth,height:image.naturalHeight,close:()=>{image.src='';URL.revokeObjectURL(url)}}}catch(error){URL.revokeObjectURL(url);throw error}
}
async function encode(source,edge,targetBytes){
 let size=fitDimensions(source.width,source.height,edge),canvas=document.createElement('canvas');
 try{
  for(let attempt=0;attempt<4;attempt++){
   canvas.width=size.width;canvas.height=size.height;const context=canvas.getContext('2d');if(!context)throw Error('Photo processing is unavailable in this browser.');
   context.fillStyle='#fff';context.fillRect(0,0,size.width,size.height);context.drawImage(source.image,0,0,size.width,size.height);
   const quality=[.84,.77,.70,.67][attempt];
   const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('Could not optimize this photo.')),'image/jpeg',quality));
   if(blob.size<=targetBytes||attempt===3)return {blob,...size};
   if(attempt>=1)size=fitDimensions(size.width,size.height,Math.round(Math.max(size.width,size.height)*.85));
  }
 }finally{canvas.width=0;canvas.height=0}
}
export async function preparePhoto(blob){
 if(!['image/jpeg','image/png','image/webp'].includes(blob.type))throw Error('Use JPEG, PNG or WebP photos.');
 if(blob.size>20*1024*1024)throw Error('Choose a photo up to 20 MB.');
 const source=await decode(blob);
 try{if(source.width*source.height>60000000)throw Error('This photo is too large to process safely. Choose a smaller export.');
  const full=await encode(source,FULL_EDGE,850*1024),thumbnail=await encode(source,THUMB_EDGE,100*1024);
  return {full,thumbnail,originalBytes:blob.size,totalBytes:full.blob.size+thumbnail.blob.size};
 }finally{source.close()}
}
export async function storePreparedPhoto(db,userId,prepared,existing=null,retire=async()=>{}){
 const stamp=crypto.randomUUID(),path=`${userId}/${stamp}-view.jpg`,thumbnailPath=`${userId}/${stamp}-thumb.jpg`,created=[];let metadataAttempted=false;
 const values={path,thumbnail_path:thumbnailPath,optimized_at:new Date().toISOString(),original_bytes:existing?.original_bytes??prepared.originalBytes,file_bytes:prepared.full.blob.size,thumbnail_bytes:prepared.thumbnail.blob.size,width:prepared.full.width,height:prepared.full.height};
 try{
  for(const [name,blob] of [[path,prepared.full.blob],[thumbnailPath,prepared.thumbnail.blob]]){check(await db.storage.from('family-photos').upload(name,blob,{contentType:'image/jpeg',upsert:false,cacheControl:'3600'}));created.push(name)}
  let result;metadataAttempted=true;
  if(existing)result=await db.from('photos').update(values).eq('id',existing.id).eq('path',existing.path).select('id');
  else result=await db.from('photos').insert({...values,uploaded_by:userId,album_id:null,published:false,caption:''}).select('id');
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
