// Older uploads used the original filename as a caption. Keep those out of
// photo descriptions and editing fields; actual written captions are retained.
export function photoCaption(value){
 const caption=typeof value==='string'?value:'';
 return /^[^\s\/\\]+\.(?:jpe?g|png|webp|heic|heif|gif|tiff?|avif)$/i.test(caption.trim())?'':caption;
}
