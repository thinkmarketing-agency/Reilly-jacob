import {check} from './api.js?v=2';
export async function returnPhotoToInbox(db,id){
 const rows=check(await db.from('photos').update({album_id:null,published:false}).eq('id',id).select('id'));
 if(rows.length!==1)throw Error('This photo is no longer available. Refresh and try again.');
}
export async function deleteInboxRecords(db,ids){
 if(!ids.length)throw Error('Select at least one inbox photo.');
 // These conditions are evaluated by the database at deletion time. A photo
 // published or placed by the other administrator is skipped, not deleted.
 return check(await db.from('photos').delete().in('id',ids).eq('published',false).is('album_id',null).select('id,path'));
}
export async function removeStoredFiles(db,paths){
 for(let start=0;start<paths.length;start+=100){
  check(await db.storage.from('family-photos').remove(paths.slice(start,start+100)));
 }
}
