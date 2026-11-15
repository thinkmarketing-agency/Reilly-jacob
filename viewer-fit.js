import {clampPan} from './gestures.js?v=9';
export function containSize(imageWidth,imageHeight,viewportWidth,viewportHeight){
 if(!(imageWidth>0&&imageHeight>0&&viewportWidth>0&&viewportHeight>0))return {width:0,height:0};
 const scale=Math.min(viewportWidth/imageWidth,viewportHeight/imageHeight);
 return {width:imageWidth*scale,height:imageHeight*scale};
}
export function layoutViewerImage(stage,image,zoom=1,x=0,y=0){
 const size=containSize(image.naturalWidth,image.naturalHeight,stage.clientWidth,stage.clientHeight);
 if(!size.width||!size.height)return {x:0,y:0};
 image.style.width=`${size.width}px`;image.style.height=`${size.height}px`;
 const pan=clampPan(x,y,zoom,stage.clientWidth,stage.clientHeight,image.naturalWidth,image.naturalHeight);
 image.style.transform=`translate(-50%, -50%) translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`;
 return pan;
}
