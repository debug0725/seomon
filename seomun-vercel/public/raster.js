// Inspect bounded file headers before asking the browser to decode an upload.
export function inspectRaster(bytes,{maxPixels=36000000,maxSide=12000}={}){
 const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes),v=new DataView(b.buffer,b.byteOffset,b.byteLength);
 const has=(at,n)=>at>=0&&at+n<=b.length;
 const word=(at,text)=>has(at,text.length)&&[...text].every((c,i)=>b[at+i]===c.charCodeAt(0));
 let type='',width=0,height=0;
 if(has(0,24)&&[137,80,78,71,13,10,26,10].every((x,i)=>b[i]===x)&&word(12,'IHDR')){type='image/png';width=v.getUint32(16);height=v.getUint32(20)}
 else if(has(0,30)&&word(0,'RIFF')&&word(8,'WEBP')){
  type='image/webp';
  if(word(12,'VP8X')){width=1+b[24]+(b[25]<<8)+(b[26]<<16);height=1+b[27]+(b[28]<<8)+(b[29]<<16)}
  else if(word(12,'VP8 ')&&b[23]===157&&b[24]===1&&b[25]===42){width=v.getUint16(26,true)&16383;height=v.getUint16(28,true)&16383}
  else if(word(12,'VP8L')&&b[20]===47){const bits=v.getUint32(21,true);width=(bits&16383)+1;height=((bits>>>14)&16383)+1}
 }else if(has(0,3)&&b[0]===255&&b[1]===216&&b[2]===255){
  type='image/jpeg';let at=2;
  while(has(at,4)){
   if(b[at++]!==255)break;while(has(at,1)&&b[at]===255)at++;
   if(!has(at,1))break;const marker=b[at++];if(marker===217||marker===218)break;
   if(marker===1||(marker>=208&&marker<=215))continue;
   if(!has(at,2))break;const length=v.getUint16(at);if(length<2||!has(at,length))break;
   if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)&&length>=8){height=v.getUint16(at+3);width=v.getUint16(at+5);break}at+=length;
  }
 }
 if(!type||!width||!height)throw Error('올바른 JPG, PNG, WebP 이미지를 골라 주세요.');
 if(width>maxSide||height>maxSide||width*height>maxPixels)throw Error('이미지 크기를 줄여 주세요.');
 return {type,width,height};
}
