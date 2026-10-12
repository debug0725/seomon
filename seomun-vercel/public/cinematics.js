import {safeAvatar} from './profile.js';
import {ULTIMATE_DURATION,ENEMY_CINEMATIC,GUARDIAN_DURATION} from './engine.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const prepared=new Map();let cleanup=null,requestSerial=0,warming=null,variant=null;
const source=key=>{variant??=(matchMedia('(max-width:760px)').matches||navigator.connection?.saveData)?'mobile':'lite';return '/'+key+'-'+variant+'.webp';};
// Keep the actual decoded image node, so an effect never starts against an empty image.
function loadArt(key,priority='low'){
 const src=source(key);if(prepared.has(src))return prepared.get(src);
 const image=new Image();image.alt='';image.decoding='async';image.fetchPriority=priority;image.draggable=false;
 const item={image,src,ready:false,promise:null};
 item.promise=new Promise((resolve,reject)=>{let settled=false;const finish=error=>{if(settled)return;settled=true;clearTimeout(timeout);image.onload=image.onerror=null;if(error)reject(error);else{item.ready=true;resolve(item)}};const timeout=setTimeout(()=>finish(Error('연출 사진을 준비하는 시간이 길어졌어요. 연결을 확인하고 다시 눌러 주세요.')),8000);image.onload=async()=>{try{if(image.decode)await image.decode();finish()}catch{finish(image.naturalWidth?null:Error('연출 이미지를 읽지 못했어요. 다시 눌러 주세요.'))}};image.onerror=()=>finish(Error('연출 이미지를 불러오지 못했어요. 다시 눌러 주세요.'));image.src=src;}).catch(error=>{if(prepared.get(src)===item)prepared.delete(src);throw error});
 prepared.set(src,item);return item;
}
export function warmCinematics(){
 if(warming)return warming;
 warming=(async()=>{for(const key of ['player-ultimate','enemy-ultimate','guardian-scene'])await loadArt(key).promise})().finally(()=>{warming=null});return warming;
}
export function stopCinematic(){requestSerial++;cleanup?.();cleanup=null;document.body.classList.remove('in-cinematic','in-red-rift');document.querySelector('.cinematic')?.remove();document.getElementById('battleCamera')?.classList.remove('camera-ultimate');}
export function imagePoint(w,h,u,v){const scale=Math.max(w/1536,h/864);return {x:(w-1536*scale)/2+u*1536*scale,y:(h-864*scale)/2+v*864*scale,scale};}
function title(kicker,name,quote){return '<div class="ritual-caption"><small>'+esc(kicker)+'</small><h2 aria-label="'+esc(name)+'">'+Array.from(name).map((c,i)=>'<span aria-hidden="true" class="cinema-glyph" style="--glyph:'+i+'">'+(c===' '?'&nbsp;':esc(c))+'</span>').join('')+'</h2><p>'+esc(quote)+'</p></div>';}
const framing='<div class="ritual-vignette"></div><div class="ritual-letterbox"><i></i><i></i></div>';
function launch(html,kind,e,duration,focus,key){
 stopCinematic();const serial=requestSerial,item=key?loadArt(key,'high'):null;
 const mount=()=>{
  if(serial!==requestSerial)return false;
  const elapsed=e.preview?0:Math.max(0,Date.now()-(e.at||Date.now()));if(elapsed>=duration)return false;
  const root=document.createElement('div');root.className='cinematic ritual-cinema '+kind;root.style.setProperty('--film-duration',duration+'ms');root.style.setProperty('--film-delay',-elapsed+'ms');root.innerHTML=(key?'<div class="ritual-art"></div>':'')+framing+html+cinemaStars();
  if(item){root.style.setProperty('--cinema-image',`url("${item.src}")`);const art=root.querySelector('.ritual-art');art.appendChild(item.image);const glitch=document.createElement('div');glitch.className='chromatic-glitch';art.appendChild(glitch)}
  root.setAttribute('role','status');root.setAttribute('aria-label',kind==='guardian-film'?'초대 무녀 서문단의 보호':kind==='rupture-film'?'망량 궁극기 적월단공':kind==='enemy-hand-film'?'망량 궁극기 백귀야행':'잔월 만상봉인 궁극기');
  const resize=()=>{const p=imagePoint(innerWidth,innerHeight,...focus);root.style.setProperty('--focus-x',p.x+'px');root.style.setProperty('--focus-y',p.y+'px');root.style.setProperty('--art-scale',p.scale);root.style.setProperty('--tokens-x',Math.max(40,Math.min(innerWidth-40,p.x))+'px');document.body.style.setProperty('--rift-origin-y',(scrollY+innerHeight*.5)+'px')};resize();
  document.body.appendChild(root);document.body.classList.add('in-cinematic');if(kind==='rupture-film'){document.body.style.setProperty('--rift-duration',duration+'ms');document.body.style.setProperty('--rift-delay',-elapsed+'ms');document.body.classList.add('in-red-rift')}
  const timer=setTimeout(()=>{if(serial===requestSerial)stopCinematic()},duration-elapsed+50);window.addEventListener('resize',resize);
  cleanup=()=>{clearTimeout(timer);window.removeEventListener('resize',resize);root.remove()};return true;
 };
 // The normal combat path is synchronous because battle entry waits for decoding.
 if(!item||item.ready)return Promise.resolve(mount());return item.promise.then(mount);
}
export function playUltimate(e){
 return launch(radiance('silver')+'<div class="snap-cross"><i></i><i></i></div><div class="release-halo"></div><div class="snap-whiteout"></div><div class="cinema-watermark" aria-hidden="true">萬象封印</div>'+title(e.preview?'瑞門 / 演出':'瑞門 / 境界解放','잔월 · 만상봉인','이 공간의 마지막 획은, 나의 것이다.'),'snap-film',e,e.duration||ULTIMATE_DURATION,[.475,.300],'player-ultimate');
}
// Baked CSS gradients brighten and expand outwards. No converging threads,
// canvas, animated filters, or additional artwork requests.
function cinemaStars(){const positions=[[14,24],[32,16],[73,19],[89,38],[20,58],[67,61],[82,78],[36,76]];return '<div class="cinema-stars" aria-hidden="true">'+positions.map(([x,y],i)=>'<i style="left:'+x+'%;top:'+y+'%;--spark:'+i+'">✦</i>').join('')+'<b class="cinema-star-seal">✦</b></div>'}
function radiance(tone){return '<div class="lumen-shadow"></div><div class="lumen-aura '+tone+'"></div><div class="lumen-bloom '+tone+'"></div><div class="lumen-diffraction '+tone+'"></div><div class="lumen-exposure"></div>'}
export function playEnemyUltimate(e){
 if(e.attack==='rupture')return playRedRift(e);
 return launch(radiance('moon')+'<div class="release-halo"></div><div class="planet-eclipse"></div>'+title('魍魎 / 黑天','백귀야행','네가 서 있는 경계마저, 손 안에 거둔다.')+'<div class="ritual-return">연출 뒤, 은빛 아홉 칸으로 피하세요.</div>','enemy-hand-film',e,e.duration||ENEMY_CINEMATIC,[.478,.510],'enemy-ultimate');
}
export function playRedRift(e){
 const shards=Array.from({length:10},(_,i)=>{const y=i%2?68+(i%3)*7:14+(i%3)*7;return '<i class="rift-shard" style="--shard:'+i+';left:'+(4+i*9)+'%;top:'+y+'vh;--pull-y:'+(50-y)+'vh">'+(i%3===0?'怨':'')+'</i>'}).join('');
 return launch('<div class="rift-haze"></div><div class="rift-bloom"></div><div class="rift-cut"></div><div class="rift-mouth"></div><div class="rift-fragments">'+shards+'</div><div class="rift-afterimage"></div>'+title('魍魎 / 赤月斷空','적월단공','붉은 한 획 아래, 모든 경계가 꺾인다.')+'<div class="ritual-return">연출 뒤, 붉은 가로 세 줄 밖으로 피하세요.</div>','rupture-film',e,e.duration||ENEMY_CINEMATIC,[.5,.5]);
}
export function playGuardian(e,s,viewerId){
 const p=s.players?.find(p=>p.id===(e.playerId||viewerId))||{name:'서문'};
 const token='<div class="guardian-tokens"><div class="guardian-token"><div><img src="'+esc(safeAvatar(p.avatar)||'/portrait-default.webp')+'" alt="'+esc(p.name)+'의 두상"></div><span>'+esc(p.name)+'</span></div></div>';
 return launch(radiance('pearl')+'<div class="guardian-dome"></div>'+token+title('瑞門丹 / 初代巫女','시조의 가호','당신은 아직, 나의 경계 안에 있다.')+'<div class="guardian-vow">'+(e.preview?'서문단이 손 안에 당신을 거둡니다.':'치명타를 막았습니다 · 체력 70 · 전투당 1회')+'</div>','guardian-film',e,e.duration||GUARDIAN_DURATION,[.545,.600],'guardian-scene');
}
