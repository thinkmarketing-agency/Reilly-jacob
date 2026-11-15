export function findPhotos(photos,query){
 const words=query.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
 return photos.filter(photo=>{const haystack=[photo.caption||'',...(photo.tags||[])].join(' ').normalize('NFKC').toLocaleLowerCase();return words.every(word=>haystack.includes(word))});
}
export function popularTags(photos){const tags=new Map();for(const photo of photos)for(const value of new Set((photo.tags||[]).map(t=>t.trim()).filter(Boolean))){const key=value.toLocaleLowerCase();const old=tags.get(key);tags.set(key,{label:old?.label||value,count:(old?.count||0)+1})}return [...tags.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label)).slice(0,6).map(t=>t.label)}
