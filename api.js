import {config} from './config.js';
let client;
export async function backend(){
 if(!config.url || !config.key) return null;
 if(!client){const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.49.8');client=createClient(config.url,config.key);}
 return client;
}
export function check(result){if(result.error)throw result.error;return result.data;}
export async function imageURL(db,path){return check(await db.storage.from('family-photos').createSignedUrl(path,300)).signedUrl;}

// Refresh an expired private-storage URL once per failed image load.
export function installImageRefresh(root,db){
 const attempted=new WeakSet();
 root.addEventListener('error',async event=>{
  const img=event.target;
  if(img.tagName!=='IMG'||!img.dataset.photoPath||attempted.has(img))return;
  attempted.add(img);const source=img.getAttribute('src'),path=img.dataset.photoPath;
  try{const url=await imageURL(db,path);if(img.getAttribute('src')===source&&img.dataset.photoPath===path)img.src=url}catch{/* An unpublished or unavailable photo stays inaccessible. */}
 },true);
 root.addEventListener('load',event=>{if(event.target.tagName==='IMG')attempted.delete(event.target)},true);
}

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function imageURLs(db,paths){
 const urls=new Map(),unique=[...new Set(paths.filter(Boolean))];
 // One database-backed Storage request per batch, never one per photo at once.
 for(let start=0;start<unique.length;start+=100){
  const batch=unique.slice(start,start+100);let result;
  for(let attempt=0;attempt<3;attempt++){
   try{result=await db.storage.from('family-photos').createSignedUrls(batch,300);if(!result.error)break}catch(error){result={error}}
   if(attempt<2)await pause(400*(attempt+1));
  }
  if(result?.error)continue;
  for(const file of result?.data||[])if(!file.error&&file.signedUrl)urls.set(file.path,file.signedUrl);
 }
 return urls;
}
export const imagePlaceholder='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="#eeeeef"/><text x="50%" y="50%" text-anchor="middle" fill="#999" font-family="sans-serif" font-size="22">Photo temporarily unavailable</text></svg>');
