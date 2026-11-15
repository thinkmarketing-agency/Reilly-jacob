export function swipeAction(dx,dy){
 if(Math.abs(dx)>=55&&Math.abs(dx)>Math.abs(dy)*1.3)return dx<0?'next':'previous';
 if(dy>=85&&dy>Math.abs(dx)*1.3)return 'close';
 return null;
}
