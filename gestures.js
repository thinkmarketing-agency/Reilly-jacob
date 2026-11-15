export function swipeAction(dx,dy){
 if(Math.abs(dx)>=55&&Math.abs(dx)>Math.abs(dy)*1.3)return dx<0?'next':'previous';
 if(dy>=85&&dy>Math.abs(dx)*1.3)return 'close';
 return null;
}

export const clampZoom=value=>Math.max(1,Math.min(5,value));
export function clampPan(x,y,zoom,stageWidth,stageHeight,imageWidth,imageHeight){
 if(stageWidth<=0||stageHeight<=0)return {x:0,y:0};
 x=Number.isFinite(x)?x:0;y=Number.isFinite(y)?y:0;
 const fit=Math.min(stageWidth/(imageWidth||stageWidth),stageHeight/(imageHeight||stageHeight));
 const maxX=Math.max(0,((imageWidth||stageWidth)*fit*zoom-stageWidth)/2);
 const maxY=Math.max(0,((imageHeight||stageHeight)*fit*zoom-stageHeight)/2);
 return {x:Math.max(-maxX,Math.min(maxX,x)),y:Math.max(-maxY,Math.min(maxY,y))};
}
