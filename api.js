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
