export const photoKey=photo=>photo.id||photo.path||photo.url;
export function shuffled(values,random=Math.random){const result=[...values];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}return result}
// A new shuffled bag is drawn only after every published photo has appeared.
export class MomentStream{
 constructor(random=Math.random){this.random=random;this.pool=[];this.bag=[];this.items=[]}
 sync(photos){
  const oldKeys=new Set(this.pool.map(photoKey));const byKey=new Map(photos.map(photo=>[photoKey(photo),photo]));
  this.pool=[...byKey.values()];
  this.items.splice(0,this.items.length,...this.items.filter(photo=>byKey.has(photoKey(photo))).map(photo=>byKey.get(photoKey(photo))));
  this.bag=this.bag.filter(photo=>byKey.has(photoKey(photo))).map(photo=>byKey.get(photoKey(photo)));
  const additions=this.pool.filter(photo=>!oldKeys.has(photoKey(photo)));
  this.bag.push(...shuffled(additions,this.random));
 }
 ensure(count){
  if(!this.pool.length)return;
  while(this.items.length<count){
   if(!this.bag.length)this.bag=shuffled(this.pool,this.random);
   const last=this.items.at(-1);
   if(this.bag.length>1&&last&&photoKey(this.bag.at(-1))===photoKey(last)){
    [this.bag[0],this.bag[this.bag.length-1]]=[this.bag.at(-1),this.bag[0]];
   }
   this.items.push(this.bag.pop());
  }
 }
}
