import {inspectRaster} from './raster.js';
// Stored browser data is untrusted. Check raster signatures and dimensions too.
export function safeAvatar(value){
 if(typeof value!=='string'||value.length>65000)return '';
 const match=/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);if(!match)return '';
 try{const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0)),image=inspectRaster(bytes,{maxPixels:1048576,maxSide:1024});return image.type===match[1]?value:''}catch{return ''}
}
export function safeProfile(value){
 if(!value||typeof value!=='object'||typeof value.name!=='string'||!['본가','경파','분가'].includes(value.family))return null;
 const name=value.name.normalize('NFC').trim().replace(/[\u0000-\u001f\u007f]/g,'');
 if(!name||name.length>12)return null;
 return {name,family:value.family,avatar:safeAvatar(value.avatar)};
}
