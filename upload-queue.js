export function fileKey(file){return [file.name,file.size,file.lastModified||0].join('|')}
export function makeUploadQueue(files,previous=[],newId=()=>crypto.randomUUID()){
 const old=new Map(previous.map(entry=>[entry.key,entry]));
 return [...new Map(files.map(file=>[fileKey(file),file])).entries()].map(([key,file])=>({key,name:file.name,size:file.size,modified:file.lastModified||0,id:old.get(key)?.id||newId(),state:'waiting',error:'',file}));
}
export function queueSnapshot(queue){return queue.map(({file,...entry})=>entry)}
