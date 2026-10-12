import { SKILLS,makeState,startBattle,advance,useSkill,movePlayer,castWard,beginWard,startWardInput,isEnemyUltimate } from './engine.js';
import { FAMILIES,REQUESTS,LOCATIONS,GUIDE } from './content.js';
import {initBattleView,renderTactics,resetBattleView,wardInputSucceeded,wardChallengeStarted,openWardInput,highlightRange,tacticalEffect} from './battleview.js';
import {playUltimate,playEnemyUltimate,playGuardian,warmCinematics,stopCinematic} from './cinematics.js';
import {safeProfile} from './profile.js';
import {enemyFor} from './enemies.js';
import {createDialogue} from './story.js';
import {createBattleClock} from './battle-clock.js';
import {createBattleMusic} from './battle-music.js';
import {inspectRaster} from './raster.js';
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const show=(id,visible=true)=>$(id).classList.toggle('hidden',!visible);
const story=createDialogue({panel:$('storyPanel'),speaker:$('storySpeaker'),text:$('storyText'),next:$('storyNext'),choices:$('storyChoices'),skip:$('storySkip'),announce:$('storyAnnounce')});
let zoneIndex=0,visitedZones=new Set(),inspecting=false;const enemyArt=new Map();
const icon=id=>`<svg><use href="#i-${id}"/></svg>`;
const storeGet=k=>{try{return JSON.parse(localStorage.getItem(k))}catch{return null}},storeSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{toast('이 기기에서 설정 저장이 제한되어 있어요.')}};
let profile=safeProfile(storeGet('seomun-profile')),view='home',state=null,playerId='',currentModal='',flowGeneration=0,lastEvent=0,resultShown=false,busy=false,guideTab='skills',clues=new Set(),toastTimer,resultTimer=null,phoneTimers=[],guideCallback=null,audioCtx=null,music=true;
const battleClock=createBattleClock({canRun:()=>!document.hidden&&view==='battle'&&state?.phase==='active',tick:()=>{advance(state);renderBattle()}});
const battleMusic=createBattleMusic({mount:$('musicPlayer'),status:$('musicStatus'),control:$('soundToggle'),onEnabled:enabled=>{music=enabled}});
function stopBattleTasks(keepMusic=false){battleClock.stop();clearTimeout(resultTimer);resultTimer=null;if(!keepMusic)battleMusic.stop()}
let selectedLocation=storeGet('seomun-location')||'city',difficultyChoice='normal',mistakes=0,discarded=new Set();
if(typeof selectedLocation!=='string'||!Object.hasOwn(LOCATIONS,selectedLocation))selectedLocation='city';
if(profile&&!FAMILIES.some(f=>f.name===profile.family))profile=null;
try{localStorage.removeItem('seomun-room')}catch{}
const avatarHTML=(p)=>`<img src="${esc(p?.avatar||'/portrait-default.webp')}" alt="${esc(p?.name||'瑞門')}의 두상">`;
function refreshProfile(){ $('headerName').textContent=profile?.name||'이름 없는 퇴마사';$('headerAvatar').innerHTML=avatarHTML(profile); }
function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('show');toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3200)}
function setModal(html,type='generic',closable=true){if(view==='home')story.stop();currentModal=type;$('modal').className='modal'+(type==='phone'?' phone-modal':'')+(type==='result'?' result-modal':'');$('modal').innerHTML=(closable?'<button class="modal-close" data-close aria-label="닫기">×</button>':'')+html;show('modalLayer');document.body.classList.add('has-flow');setTimeout(()=>{$('modal').querySelector('input,button')?.focus()},60)}
function closeModal(){phoneTimers.forEach(clearTimeout);phoneTimers=[];show('modalLayer',false);currentModal='';document.body.classList.remove('has-flow');}
function wipe(fn){fn();$('stage').classList.remove('scene-shift');void $('stage').offsetWidth;$('stage').classList.add('scene-shift');setTimeout(()=>$('stage').classList.remove('scene-shift'),600)}
function updateProgress(index){$('questProgress').querySelectorAll(':scope>div').forEach((e,i)=>{e.className=i<index?'done':i===index?'current':''})}
function showProfile(next=null){
 guideCallback=next;let chosen=profile?.family||'본가',avatar=profile?.avatar||'';
 setModal(`<p class="modal-eyebrow">CHARACTER / 瑞門</p><h2>당신은 누구입니까.</h2><p class="modal-description">이름을 새기고, 당신이 이어 갈 瑞門의 갈래를 선택하세요.</p><form id="profileForm"><div class="profile-form-row"><label class="portrait-upload"><span class="avatar" id="portraitPreview">${avatarHTML(profile)}</span><span>두상 이미지 선택</span><input id="portraitInput" type="file" accept="image/jpeg,image/png,image/webp" aria-label="두상 이미지 선택"></label><div class="name-group"><label class="form-label" for="playerName">퇴마사의 이름</label><input class="name-input" id="playerName" placeholder="이름을 새겨 주세요" maxlength="12" required value="${esc(profile?.name||'')}" autocomplete="off"><div class="input-hint">1~12자 · 두상은 정사각형으로 잘라 저장합니다.</div></div></div><label class="form-label">瑞門의 갈래</label><div class="family-options">${FAMILIES.map(f=>`<button type="button" class="family-option ${f.name===chosen?'selected':''}" data-family="${f.name}"><span class="han">${f.han}</span><b>${f.name}</b><small>${f.motto}<br>${f.desc.replace(/\n/g,'<br>')}</small></button>`).join('')}</div><div class="modal-actions"><small>가문에 따라 도착하는<br>의뢰 메시지가 달라집니다.</small><button class="primary ink-btn" type="submit">${next?'이야기 시작':'설정 저장'} ${icon('arrow')}</button></div></form>`,'profile');
 $('modal').querySelectorAll('[data-family]').forEach(b=>b.onclick=()=>{chosen=b.dataset.family;$('modal').querySelectorAll('[data-family]').forEach(x=>x.classList.toggle('selected',x===b));sfx('tap')});
 const form=$('profileForm');let uploadGeneration=0;
 $('portraitInput').onchange=async e=>{const file=e.target.files[0];if(!file)return;let url;const stamp=++uploadGeneration,stillOpen=()=>currentModal==='profile'&&$('profileForm')===form&&stamp===uploadGeneration;
  try{
   if(file.size>8000000||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('8MB 이하의 JPG, PNG, WebP를 골라 주세요.');
   const raster=inspectRaster(await file.slice(0,262144).arrayBuffer());if(raster.type!==file.type)throw Error('파일 형식과 이미지 내용이 일치하지 않아요.');if(!stillOpen())return;
   url=URL.createObjectURL(file);const img=new Image();await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{img.onload=img.onerror=null;reject(Error('이미지 준비가 늦어지고 있어요. 다시 골라 주세요.'))},8000);img.onload=()=>{clearTimeout(timer);resolve()};img.onerror=()=>{clearTimeout(timer);reject(Error('이미지를 읽지 못했어요.'))};img.src=url});if(!stillOpen())return;
   if(img.naturalWidth*img.naturalHeight>36000000||Math.max(img.naturalWidth,img.naturalHeight)>12000)throw Error('이미지 크기를 줄여 주세요.');
   const c=document.createElement('canvas');c.width=c.height=240;const d=c.getContext('2d'),side=Math.min(img.naturalWidth,img.naturalHeight);if(!d)throw Error('이미지를 변환하지 못했어요.');d.drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,240,240);const encoded=c.toDataURL('image/jpeg',.78);if(encoded.length>65000)throw Error('더 작은 이미지를 골라 주세요.');avatar=encoded;$('portraitPreview').innerHTML=`<img src="${avatar}" alt="선택한 두상">`;
  }catch(err){if(stillOpen())toast(err.message||'이미지를 읽지 못했어요.')}finally{if(url)URL.revokeObjectURL(url)}
 };
 $('profileForm').onsubmit=e=>{e.preventDefault();const name=$('playerName').value.trim();if(!name){toast('퇴마사의 이름을 입력해 주세요.');$('playerName').focus();return}profile=safeProfile({name,family:chosen,avatar});if(!profile){toast('이름과 이미지를 다시 확인해 주세요.');return}storeSet('seomun-profile',profile);refreshProfile();closeModal();sfx('tap');if(next)next();else{if(view==='home')homeStory();toast('瑞門의 이름을 새겼어요.')}};
}
function homeStory(){
 story.play([{speaker:'瑞門錄',text:'도시의 불빛이 잠들지 않는 밤. 조부가 세운 결계에, 처음으로 금이 갔다.'},{speaker:'瑞門錄',text:'달이 기울자 잊힌 것들이 깨어났다. 이제 이 경계를 이어 낼 사람은, 당신이다.'}],{endLabel:'의뢰 열기 ✦',onComplete:begin});
}
function begin(){
 if(busy)return;if(state?.phase==='active'){toast('진행 중인 의뢰를 마치거나 중단한 뒤 시작하세요.');return}
 flowGeneration++;stopBattleTasks();unlockSound();story.stop();stopCinematic();warmCinematics().catch(()=>{});closeModal();
 state=null;resultShown=false;clues.clear();discarded.clear();mistakes=0;inspecting=false;visitedZones.clear();
 if(view!=='home'){resetHome();story.stop()}
 battleMusic.prepare();if(!profile)showProfile(chooseLocation);else chooseLocation();
}
function applyLocation(){
 const place=LOCATIONS[view==='home'&&!currentModal?'city':selectedLocation],foe=enemyFor(selectedLocation);$('bossName').textContent=foe.name;$('bossHan').textContent=foe.han;$('bossEpithet').textContent=foe.epithet;$('stage').querySelector('.scene-art').style.backgroundImage=`url('/${place.image}')`;
 $('stage').querySelector('.coordinates').textContent=place.coordinates;$('locationTag').querySelector('strong').textContent=place.name;$('stageWeather').textContent=place.sub;
}
function chooseLocation(){
 setModal(`<p class="modal-eyebrow">SELECT FIELD / 異境</p><h2>어디에, 결계를 세울까요.</h2><p class="modal-description">세 장소에는 서로 다른 흔적이 남아 있습니다.<br>사람의 흔적과 망량의 단서를 구별하세요.</p><div class="scene-selector">${Object.entries(LOCATIONS).map(([key,v])=>`<button class="scene-choice ${key===selectedLocation?'selected':''}" data-location="${key}"><img src="/${v.image}" alt="${v.name}"><span class="scene-han">${v.han}</span><div><strong>${v.name}</strong><small>${v.sub}</small></div></button>`).join('')}</div><div class="difficulty-select"><span>전투 난이도</span><button data-level="normal" class="${difficultyChoice==='normal'?'selected':''}">일반</button><button data-level="hard" class="${difficultyChoice==='hard'?'selected':''}">악몽</button></div><div class="modal-actions"><small>이동 · 공격 반경 · 능력 봉쇄<br>전투 중 하나씩 배웁니다.</small><button class="primary ink-btn" id="goStory">의뢰 확인 ${icon('arrow')}</button></div>`,'location');
 $('modal').querySelectorAll('[data-location]').forEach(b=>b.onclick=()=>{selectedLocation=b.dataset.location;storeSet('seomun-location',selectedLocation);applyLocation();$('modal').querySelectorAll('[data-location]').forEach(x=>x.classList.toggle('selected',x===b));sfx('tap')});
 $('modal').querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{difficultyChoice=b.dataset.level;$('modal').querySelectorAll('[data-level]').forEach(x=>x.classList.toggle('selected',x===b))});
 $('goStory').onclick=()=>{closeModal();applyLocation();showPhone()};
}

function showPhone(){
 const r=REQUESTS[profile.family];
 setModal(`<div class="phone"><div class="phone-screen"><div class="phone-status"><span>23:47</span><i class="dynamic-island"></i><span class="phone-signals">▮▮▮  ▰</span></div><div class="chat-header"><small>〈 카카오톡</small><b>${esc(r.sender)}</b><small>☰</small></div><div class="chat-day">잔월이 기우는 밤</div><div class="chat-messages" id="chatMessages"></div><div class="chat-accept"><button class="primary" id="acceptQuest" disabled>의뢰를 읽는 중…</button><small>한 통의 메시지가 당신을 경계 너머로 이끕니다.</small></div><div class="home-indicator"></div></div></div><p class="phone-caption">瑞門 ${esc(profile.name)}에게 도착한 의뢰</p>`,'phone');
 const append=(sender,message,type='')=>{if(currentModal!=='phone')return;const div=document.createElement('div');div.className='chat-row '+type;div.innerHTML=type==='self'?`<div><div class="chat-bubble">${esc(message)}</div><div class="chat-time">23:47</div></div>`:`<div class="chat-person ${type}">${type==='bank'?'₩':'門'}</div><div><div class="chat-name">${esc(sender)}</div><div class="chat-bubble">${esc(message)}</div><div class="chat-time">23:47</div></div>`;$('chatMessages').appendChild(div);$('chatMessages').scrollTop=$('chatMessages').scrollHeight;sfx('message')};
 phoneTimers.push(setTimeout(()=>append(r.sender,`瑞門 ${profile.name} 님, 늦은 시간 연락드립니다.`),450));
 phoneTimers.push(setTimeout(()=>append(r.sender,r.message.replaceAll('폐사당',LOCATIONS[selectedLocation].short).replaceAll('숲',selectedLocation==='school'?'교실':selectedLocation==='city'?'상공':'숲')),1100));
 if(r.bank)phoneTimers.push(setTimeout(()=>append('은행 입금 알림',r.bank,'bank'),1850));
 phoneTimers.push(setTimeout(()=>{if(currentModal==='phone'){const b=$('acceptQuest');b.disabled=false;b.textContent='의뢰 수락';b.onclick=()=>{b.disabled=true;b.textContent=LOCATIONS[selectedLocation].short+'로 향하는 중…';append('',r.reply,'self');phoneTimers.push(setTimeout(()=>{closeModal();wipe(startExplore)},1100))}}},r.bank?2400:1800));
}
function prepareEnemy(){
 const foe=enemyFor(selectedLocation),file=selectedLocation==='city'?foe.image:foe.image.replace('.webp',matchMedia('(max-width:760px)').matches?'-mobile.webp':'.webp');
 if(enemyArt.has(file))return enemyArt.get(file);
 const image=new Image();image.alt='';image.decoding='async';image.fetchPriority='low';
 let promise;promise=new Promise((resolve,reject)=>{
  let settled=false;
  const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);image.onload=image.onerror=null;error?reject(error):resolve(image)};
  const timer=setTimeout(()=>finish(Error('망량의 그림을 준비하지 못했어요. 다시 눌러 주세요.')),8000);
  image.onload=async()=>{try{if(image.decode)await image.decode();finish()}catch{finish(Error('망량의 그림을 읽지 못했어요.'))}};
  image.onerror=()=>finish(Error('망량의 그림을 불러오지 못했어요.'));image.src='/'+file;
 }).catch(error=>{if(enemyArt.get(file)===promise)enemyArt.delete(file);throw error});
 enemyArt.set(file,promise);return promise;
}
function startExplore(){
 warmCinematics().catch(()=>{});prepareEnemy().catch(()=>{});story.stop();view='explore';inspecting=true;zoneIndex=0;visitedZones.clear();$('stage').className='stage explore';applyLocation();
 ['heroCopy','locationTag','stageSubtitle','encounterArt'].forEach(id=>show(id,false));['exploreHotspots','exploreHud','exploreRoute'].forEach(id=>show(id));
 $('chapterLabel').textContent=LOCATIONS[selectedLocation].short+' · 흔적 탐색';updateProgress(1);renderZone();setExploreInteraction(false);
 story.play(LOCATIONS[selectedLocation].intro.map(text=>({speaker:'瑞門 '+profile.name,text})),{endLabel:'탐색 시작 ✦',onComplete:()=>{inspecting=false;idleExplore()}});
 $('stage').scrollIntoView({behavior:'smooth',block:'start'});
}
function setExploreInteraction(enabled){$('exploreRoute').querySelectorAll('button').forEach(b=>b.disabled=!enabled);$('exploreHotspots').querySelectorAll('button').forEach(b=>b.disabled=!enabled||clues.has(Number(b.dataset.clue))||discarded.has(Number(b.dataset.clue)))}
function renderZone(){
 const loc=LOCATIONS[selectedLocation],zone=loc.zones[zoneIndex];visitedZones.add(zoneIndex);$('stage').querySelector('.scene-art').style.transform=zone.camera;
 $('stage').querySelector('.coordinates').textContent=loc.short+' / '+zone.code;$('zoneName').textContent=zone.name;
 $('exploreRoute').innerHTML=loc.zones.map((z,i)=>`${i?'<span class="route-link" aria-hidden="true"></span>':''}<button class="route-zone ${i===zoneIndex?'selected':''} ${visitedZones.has(i)?'visited':''}" data-zone="${i}" aria-current="${i===zoneIndex?'location':'false'}"><i aria-hidden="true">✦</i>${z.name}</button>`).join('');
 $('exploreHotspots').innerHTML=zone.clues.map(i=>{const c=loc.clues[i];return `<button class="hotspot ${clues.has(i)?'found':discarded.has(i)?'false':''}" data-clue="${i}" aria-label="${c.title} 살펴보기"><span class="spot-pulse">${clues.has(i)?'✦':discarded.has(i)?'×':'✧'}</span><span>${c.title}</span></button>`}).join('');
 $('exploreRoute').onclick=e=>{const b=e.target.closest('[data-zone]');if(!b||b.disabled||inspecting||view!=='explore'||Number(b.dataset.zone)===zoneIndex)return;zoneIndex=Number(b.dataset.zone);renderZone();idleExplore();sfx('tap')};
 $('exploreHotspots').onclick=e=>{const b=e.target.closest('[data-clue]');if(b&&!b.disabled)investigate(Number(b.dataset.clue))};updateClues();setExploreInteraction(!inspecting);
}
function updateClues(){const label='단서 '+clues.size+' / 3';$('chapterState').textContent=label+' · 오염 '+mistakes;$('clueCount').textContent=label;$('clueInventory').querySelectorAll('i').forEach((el,i)=>el.classList.toggle('on',i<clues.size));$('stageCounter').textContent='탐색 '+visitedZones.size+' / 3구역 · '+label}
function idleExplore(){if(view!=='explore')return;inspecting=false;setExploreInteraction(true);story.play([{speaker:'瑞門 '+profile.name,text:LOCATIONS[selectedLocation].zones[zoneIndex].text}],{endLabel:'흔적을 살펴보자 ✦'});}
function investigate(index){
 if(view!=='explore'||inspecting||clues.has(index)||discarded.has(index)||!LOCATIONS[selectedLocation].zones[zoneIndex].clues.includes(index))return;
 const c=LOCATIONS[selectedLocation].clues[index];inspecting=true;setExploreInteraction(false);
 story.play([{speaker:c.title,text:c.text}],{choices:[{label:'지나치기',run:()=>idleExplore()},{label:'단서로 채택 ✦',primary:true,run:()=>{
  if(c.valid){clues.add(index);sfx('clue')}else{discarded.add(index);mistakes=Math.min(3,mistakes+1);sfx('enemy')}
  renderZone();setExploreInteraction(false);
  story.play([{speaker:'瑞門 '+profile.name,text:c.valid?'서녘님의 기운이 응답한다. 올바른 흔적이다. '+(clues.size===3?'세 흔적이 이어졌다. 망량의 진짜 자리가 드러난다.':'다른 구역의 흔적도 이어 보자.'):'사람이 남긴 평범한 물건이었다. 결계에 오염이 스며든다. 시작 체력 -12.'}],{endLabel:clues.size===3?'기척을 따라간다 ✦':'탐색 계속 ✦',onComplete:()=>clues.size===3?finishExplore():idleExplore()});
 }}]});
}
async function finishExplore(){
 const generation=flowGeneration;view='encounter';inspecting=true;['exploreHotspots','exploreRoute','exploreHud'].forEach(id=>show(id,false));$('stage').className='stage encounter';$('chapterState').textContent='망량 발견';
 story.play([{speaker:'瑞門 '+profile.name,text:'세 흔적이 하나로 이어진다. 경계 너머에서, 누군가 나를 보고 있다.'}],{endLabel:'기척을 기다리는 중…'});$('storyNext').disabled=true;$('storySkip').disabled=true;
 try{const image=await prepareEnemy();if(generation!==flowGeneration)return;const foe=enemyFor(selectedLocation);$('encounterArt').className='encounter-art enemy-'+selectedLocation;$('encounterArt').replaceChildren(image);$('chapterLabel').textContent=LOCATIONS[selectedLocation].short+' · '+foe.name;
  story.play([{speaker:'瑞門錄',text:foe.description},{speaker:'망량 · '+foe.name,text:foe.quote}],{endLabel:'전투 시작 ✦',onComplete:startSolo});sfx('enemy');
 }catch(error){if(generation!==flowGeneration)return;toast(error.message);story.play([{speaker:'瑞門錄',text:'경계 너머의 형체를 아직 불러오지 못했다.'}],{choices:[{label:'다시 살펴보기 ✦',primary:true,run:finishExplore},{label:'의뢰록으로',run:resetHome}]})}
 finally{if(generation===flowGeneration){$('storyNext').disabled=false;$('storySkip').disabled=false}}
}

async function startSolo(){
 if(busy||!profile)return;stopBattleTasks(true);busy=true;const generation=flowGeneration;unlockSound();battleMusic.start();story.stop();closeModal();view='preparing';show('stageSubtitle');$('stageSubtitle').textContent='술식의 그림을 준비하고 있습니다…';
 try{await warmCinematics();if(generation!==flowGeneration)return;playerId=crypto.randomUUID();state=makeState({...profile,id:playerId},Date.now(),'solo',selectedLocation,difficultyChoice);state.exposure=mistakes;startBattle(state,playerId);lastEvent=0;resultShown=false;wipe(enterBattle);}
 catch(error){if(generation!==flowGeneration)return;battleMusic.stop();toast(error.message);setModal('<p class="modal-eyebrow">술식 준비</p><h2>그림을 불러오지 못했어요.</h2><p class="modal-description">연결을 확인하고 다시 준비해 주세요.</p><button class="primary" id="retryArt">다시 준비하기</button>','preparation');$('retryArt').onclick=startSolo;}
 finally{if(generation===flowGeneration){busy=false;updateCooldowns(state?.players[0])}}
}

function enterBattle(){
 view='battle';selectedLocation=state.location;applyLocation();resetBattleView();$('stage').className='stage battle';$('stage').querySelector('.scene-art').style.transform='';
 story.stop();['heroCopy','locationTag','exploreHotspots','stageSubtitle','exploreHud','exploreRoute','encounterArt'].forEach(id=>show(id,false));
 ['bossHud','combatPanel','battleMeta','tacticalField','tutorialCard','fieldLegend','moveControls','ritualPanel','retreatBattle'].forEach(id=>show(id));
 $('missionPanel').parentElement.classList.add('hidden');$('chapterLabel').textContent=LOCATIONS[selectedLocation].short+' · 망량 토벌';$('chapterState').innerHTML='단독 전투'+' <span class="live-dot"></span>';updateProgress(2);$('battleAvatar').innerHTML=avatarHTML(state.players[0]);renderSkills(state.players[0]);renderBattle();battleClock.start();$('stage').scrollIntoView({behavior:'smooth',block:'start'});sfx('start');
}

function renderSkills(p){
 $('skills').innerHTML=Object.entries(SKILLS).map(([key,k],i)=>`<button class="skill ${k.color}" data-skill="${key}" title="${k.desc}"><kbd class="key">${i+1}</kbd><span>${k.han}</span><strong>${k.name}</strong><small>${key==='ultimate'?'궁극 '+(p?.charge||0)+' / 100':key==='barrier'?'주문 입력':k.cost?'영력 '+k.cost:'사거리 2칸'}</small>${key==='ultimate'?'<i class="charge-track"><i></i></i>':''}<i class="cooldown hidden"></i></button>`).join('');updateCooldowns(p);
}

function updateCooldowns(p){
 if(!p)return;document.querySelectorAll('[data-skill]').forEach(b=>{
  const key=b.dataset.skill,k=SKILLS[key],remain=Math.max(0,(p.cooldowns[key]||0)-Date.now()),locked=p.lockedUntil>Date.now()&&state.bossHp>0&&!['slash','barrier'].includes(key);
  b.classList.toggle('locked',locked);const tutorialLocked=(key==='talisman'&&p.tutorialStep<2)||(['slash','ultimate'].includes(key)&&p.tutorialStep<3);b.disabled=tutorialLocked||busy||state?.phase!=='active'||p.hp<=0||p.sp<k.cost||state.cinematicUntil>Date.now()||locked||remain>0||(key==='ultimate'&&p.charge<100)||(state.bossHp===0&&!['barrier','heal'].includes(key));
  const c=b.querySelector('.cooldown');c.classList.toggle('hidden',remain<=0);c.textContent=(remain/1000).toFixed(1);
  if(key==='ultimate'){b.querySelector('small').textContent='궁극 '+p.charge+' / 100';b.querySelector('.charge-track>i').style.width=p.charge+'%'}
 });
}
let dodgeWarningSeen =
  localStorage.getItem('seomun-dodge-warning-seen') === 'true';

let firstWarningAttack = null;
function renderBattle(){
 if(!state||view!=='battle'||state.version!==6)return;if(state.cinematicUntil>Date.now()&&document.body.classList.contains('in-cinematic')&&state.serial===lastEvent)return;const p=state.players.find(p=>p.id===playerId);if(!p)return;
 $('battleName').textContent=p.name;$('guardianNote').textContent=p.guardianUntil>Date.now()?'서문단의 보호 · '+Math.max(0,(p.guardianUntil-Math.max(Date.now(),state.cinematicUntil))/1000).toFixed(1)+'초의 가호':p.guardianUsed?'시조의 가호 · 사용 완료':'시조의 가호 · 남은 1회';$('battleFamily').textContent=p.lockedUntil>Date.now()&&state.bossHp>0?'술식 봉쇄':p.family;
 $('hpFill').style.width=p.hp/140*100+'%';$('spFill').style.width=p.sp+'%';$('statText').textContent=`체력 ${p.hp} / 140 · 영력 ${p.sp}`;
 $('bossFill').style.width=(state.bossHp/state.bossMax*100)+'%';$('bossHpText').textContent=state.bossHp.toLocaleString()+' / '+state.bossMax.toLocaleString();$('phaseLabel').textContent=state.bossHp===0?'SEALED':state.bossHp<state.bossMax*.4?'PHASE II':'PHASE I';
 $('wardValue').innerHTML=state.ward+'<small>%</small>';$('wardRing').style.setProperty('--ward',state.ward+'%');$('wardNote').textContent=state.panels.filter(x=>x.integrity===100).length+' / 6면 완성';updateCooldowns(p);renderTactics(state,playerId);
 const impending =
  state.phase === 'active' &&
  state.bossHp > 0 &&
  state.attack &&
  (
    isEnemyUltimate(state.attack.type) ||
    state.attack.landAt - Date.now() < 2000
  );

if (
  impending &&
  !isEnemyUltimate(state.attack.type) &&
  !dodgeWarningSeen
) {
  dodgeWarningSeen = true;
  firstWarningAttack = state.attack;

  try {
    localStorage.setItem('seomun-dodge-warning-seen', 'true');
  } catch {}
}

const warning =
  impending &&
  (
    isEnemyUltimate(state.attack.type) ||
    state.attack === firstWarningAttack
  );

show('combatWarning', !!warning);
 if(warning){$('combatWarning').querySelector('b').textContent=state.attack.type==='rupture'?'적월단공 · 붉은 가로 세 줄 밖으로':state.attack.type==='ultimate'?'백귀야행 · 은빛 칸으로 도망쳐':'붉은 칸에서 벗어나세요';$('combatWarning').querySelector('small').textContent='겹치면 피해 · 술식 봉쇄 · 격자 파괴'}
 if(state.bossHp===0&&state.phase==='active'){show('stageSubtitle');$('stageSubtitle').textContent='망량 퇴치. 주문을 이어 여섯 면을 완성하세요.';updateProgress(3)}
 if(state.serial!==lastEvent)$('battleLog').innerHTML=state.events.filter(e=>e.type!=='move').slice(-3).map(e=>`<div>${esc(e.text)}</div>`).join('');
 for(const e of state.events){if(e.id>lastEvent)eventEffect(e)}lastEvent=state.serial;
 if(['cleared','failed'].includes(state.phase)&&!resultShown){resultShown=true;battleClock.stop();show('combatWarning',false);const completed=state,generation=flowGeneration;const timer=setTimeout(()=>{if(resultTimer!==timer)return;resultTimer=null;if(generation===flowGeneration&&state===completed&&view==='battle'&&['cleared','failed'].includes(state.phase))showResult()},state.cinematicUntil>Date.now()?Math.max(900,state.cinematicUntil-Date.now()+150):900);resultTimer=timer}
}

async function cast(skill){
 if(skill==='barrier'){focusRitual();return}if(!state||busy)return;busy=true;
 try{useSkill(state,playerId,skill);renderBattle()}
 catch(e){toast(e.message)}finally{busy=false;updateCooldowns(state?.players.find(p=>p.id===playerId))}
}
function performWardBegin(panel){if(!state||busy||view!=='battle')return;busy=true;try{beginWard(state,playerId,panel,Date.now(),true);wardChallengeStarted();renderBattle();sfx('barrier')}catch(error){toast(error.message);renderBattle()}finally{busy=false;updateCooldowns(state?.players[0])}}
function focusRitual(){if(view!=='battle')return;$('ritualPanel').scrollIntoView({behavior:'smooth',block:'center'});openWardInput()}
async function performMove(x,y){if(!state||view!=='battle'||busy||state.phase!=='active')return;busy=true;
 try{movePlayer(state,playerId,{x,y});renderBattle();sfx('tap')}
 catch(e){if(!/발걸음|연출 중/.test(e.message))toast(e.message)}finally{busy=false;updateCooldowns(state?.players.find(p=>p.id===playerId))}
}
function moveDirection(dx,dy){const p=state?.players.find(p=>p.id===playerId);if(p)performMove(p.position.x+dx,p.position.y+dy)}
async function performWard(spell,panel){if(!state||busy)return;busy=true;
 try{castWard(state,playerId,spell,panel);wardInputSucceeded();renderBattle();sfx('barrier')}
 catch(e){toast(e.message)}finally{busy=false;updateCooldowns(state?.players.find(p=>p.id===playerId))}
}
function retreatBattle(){closeModal();document.body.classList.remove('ritual-typing');resetHome();toast('의뢰에서 물러났어요. 다시 준비할 수 있습니다.')}

function eventEffect(e){tacticalEffect(e,state,playerId);if(e.type==='skill'||e.type==='ultimate')sfx(e.skill);else if(e.type==='enemy'||e.type==='wardBreak'||e.type==='enemyUltimate')sfx(e.type==='enemyUltimate'?(e.attack==='rupture'?'redRift':'enemyUltimate'):'enemy');else if(e.type==='guardian')sfx('guardian');else if(e.type==='clear')sfx('clear')}

function showResult(){if(!state||!['cleared','failed'].includes(state.phase))return;stopBattleTasks();show('tutorialCard',false);show('tutorialFrame',false);show('tutorialLine',false);const success=state.phase==='cleared',elapsed=Math.max(1,Math.floor((Date.now()-state.startedAt)/1000)),total=state.players.reduce((a,p)=>a+p.damage,0);if(success){$('chapterState').textContent='의뢰 완료';updateProgress(4);storeSet('seomun-completed',true)}setModal(`<div class="result-seal">${success?'完':'再'}</div><p class="modal-eyebrow">${success?'MISSION COMPLETE / 結界復元':'EXORCISM FAILED / 再挑戰'}</p><h2>${success?'결계가 다시 이어졌다.':'아직, 끝난 것은 아니다.'}</h2><p class="modal-description">${success?`${esc(profile.name)}, 조부가 남긴 경계에 다시 기운이 흐릅니다.<br>${LOCATIONS[state.location].short}이 잠시 고요를 되찾았습니다.`:'한숨 돌리고 술식을 다시 준비하세요.<br>붉은 칸을 피하고, 깨진 격자를 주문으로 이어 주세요.'}</p><div class="result-statistics"><div><strong>${elapsed}<small> 초</small></strong><small>전투 시간</small></div><div><strong>${total.toLocaleString()}</strong><small>총 피해량</small></div><div><strong>${state.ward}<small>%</small></strong><small>결계 보수율</small></div></div><div class="modal-actions"><button class="secondary" id="resultHome">의뢰록으로</button><button class="primary ink-btn" id="resultAgain">다시 도전 ${icon('arrow')}</button></div>`,'result',false);$('resultHome').onclick=()=>{closeModal();resetHome()};$('resultAgain').onclick=()=>{closeModal();startSolo()}}
function resetHome(){flowGeneration++;stopBattleTasks();busy=false;closeModal();story.stop();$('storyNext').disabled=false;$('storySkip').disabled=false;inspecting=false;document.body.classList.remove('ritual-typing');resetBattleView();view='home';applyLocation();$('stage').querySelector('.scene-art').style.transform='';state=null;resultShown=false;clues.clear();discarded.clear();mistakes=0;visitedZones.clear();$('stage').className='stage home';show('heroCopy');show('locationTag');['bossHud','combatWarning','combatPanel','battleMeta','exploreHotspots','stageSubtitle','tacticalField','tutorialCard','fieldLegend','moveControls','ritualPanel','retreatBattle','exploreHud','exploreRoute','encounterArt'].forEach(id=>show(id,false));$('encounterArt').replaceChildren();$('missionPanel').parentElement.classList.remove('hidden');$('skills').innerHTML='';$('effects').innerHTML='';$('chapterLabel').textContent='제 1장 : 삼사라의 결계 보수';$('chapterState').innerHTML='의뢰 대기 <span class="live-dot"></span>';$('stageCounter').textContent='SEOMUN ARCHIVE / NO. 001';updateProgress(0);homeStory()}
function showGuide(tab='skills',next=null){if(view==='encounter'||view==='preparing'||inspecting){toast('지금의 이야기를 읽은 뒤 瑞門錄을 열어 주세요.');return}guideTab=tab;guideCallback=next;drawGuide()}
function drawGuide(){const g=GUIDE[guideTab];setModal(`<p class="modal-eyebrow">FIELD GUIDE / 瑞門錄</p><div class="guide-tabs"><button data-tab="skills" class="${guideTab==='skills'?'selected':''}">술식</button><i></i><button data-tab="ward" class="${guideTab==='ward'?'selected':''}">결계</button><i></i><button data-tab="enemy" class="${guideTab==='enemy'?'selected':''}">망량</button></div><h2>${g.title}</h2><p class="modal-description">${g.sub}</p><div class="line-guide">${g.rows.map((r,i)=>`<div class="line-guide-row"><div class="guide-node"><span>${r[0]}</span><small>0${i+1}</small></div><i class="leader-line"></i><div class="guide-definition"><div><b>${r[1]}</b><small>${r[2]}</small></div><p>${r[3]}</p></div></div>`).join('')}</div><div class="modal-actions" style="margin-top:26px"><small>기본 수치는 임시값입니다.<br>커뮤니티 설정에 맞게 바꿀 수 있습니다.</small><button class="primary ink-btn" id="closeGuide">${guideCallback?'전투 준비':'확인'} ${icon('arrow')}</button></div>`,'guide',!guideCallback);$('modal').querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{guideTab=b.dataset.tab;drawGuide()});$('closeGuide').onclick=()=>{const next=guideCallback;closeModal();if(next)next();else if(view==='home')homeStory()}}
function sfx(type){if(!music||!audioCtx)return;try{const t=audioCtx.currentTime;
 const tone=(hz,start,length,volume=.018,wave='sine',end=hz)=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=wave;o.frequency.setValueAtTime(hz,t+start);o.frequency.exponentialRampToValueAtTime(Math.max(1,end),t+start+length);g.gain.setValueAtTime(.0001,t+start);g.gain.linearRampToValueAtTime(volume,t+start+.04);g.gain.exponentialRampToValueAtTime(.0001,t+start+length);o.connect(g);g.connect(audioCtx.destination);o.start(t+start);o.stop(t+start+length+.05)};
 const air=(start,length,volume,cutoff)=>{const n=audioCtx.createBufferSource(),buffer=audioCtx.createBuffer(1,Math.ceil(audioCtx.sampleRate*length),audioCtx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1);n.buffer=buffer;const f=audioCtx.createBiquadFilter(),g=audioCtx.createGain();f.type='lowpass';f.frequency.value=cutoff;g.gain.setValueAtTime(.0001,t+start);g.gain.linearRampToValueAtTime(volume,t+start+Math.min(.6,length*.4));g.gain.exponentialRampToValueAtTime(.0001,t+start+length);n.connect(f);f.connect(g);g.connect(audioCtx.destination);n.start(t+start)};
 if(type==='ultimate'){[146.83,220,293.66,440].forEach((hz,i)=>tone(hz,.1+i*.08,2.1,.016));tone(74,.65,1.5,.018,'sine',890);air(1.65,.8,.04,3500);tone(64,2.5,.8,.04,'sine',24);tone(880,2.5,.65,.02,'triangle',160);return}
 if(type==='redRift'){tone(48,0,3.4,.025,'triangle',22);air(.45,.4,.025,2200);tone(90,.8,2,.025,'sawtooth',35);air(1.2,1.7,.025,450);return}
 if(type==='guardian'){[130.81,196,261.63,392].forEach((hz,i)=>tone(hz,.4+i*.2,2.9,.012));air(.3,2.8,.016,900);tone(523.25,1.3,2.3,.009);return}
 if(type==='enemyUltimate'){tone(43,0,2.9,.028,'sawtooth',29);air(.2,2.6,.055,380);[118,123,127].forEach((hz,i)=>tone(hz,.6+i*.25,2.4,.012,'triangle',hz*.6));tone(35,2.2,.65,.03,'sine',18);return}
 const hz={tap:600,message:800,clue:430,start:160,slash:220,talisman:450,barrier:320,heal:620,enemy:75,clear:880}[type]||400;tone(hz,0,.35,.025,['slash','enemy'].includes(type)?'sawtooth':'sine',hz*.55)}catch{}}
function unlockSound(){if(!music)return;try{if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();audioCtx.resume().catch(()=>{})}catch{}}
function toggleMusic(){const enabled=battleMusic.toggle();if(enabled)unlockSound();if(view!=='battle'&&view!=='preparing')toast(enabled?'전투 시작 시 음악을 재생합니다.':'전투 음악과 효과음을 껐어요.')}
function startParticles(){const layer=$('particles');let visible=true;const pause=()=>layer.classList.toggle('ambient-paused',!visible||document.hidden);new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;pause()}).observe(layer);document.addEventListener('visibilitychange',pause)}
$('modal').addEventListener('click',e=>{if(e.target.closest('[data-close]')){closeModal();if(view==='home')homeStory()}});$('modalBackdrop').onclick=()=>{if($('modal').querySelector('[data-close]')){closeModal();if(view==='home')homeStory()}};
document.addEventListener('keydown',e=>{if(!currentModal&&['home','explore','encounter'].includes(view)&&['Enter',' '].includes(e.key)&&!e.target.closest('button,input,textarea,summary')){e.preventDefault();story.advance();return}if(currentModal&&e.key==='Escape'&&$('modal').querySelector('[data-close]')){closeModal();if(view==='home')homeStory();return}if(view==='battle'&&e.target.closest('input,textarea'))return;const direction={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]}[e.key];if(view==='battle'&&direction){e.preventDefault();moveDirection(...direction);return}if(view==='battle'&&['1','2','3','4','5'].includes(e.key)){e.preventDefault();cast(Object.keys(SKILLS)[Number(e.key)-1])}});
$('beginQuest').onclick=()=>begin();$('navProfile').onclick=()=>view!=='home'||state?.phase==='active'||busy?toast('캐릭터 설정은 의뢰를 마친 뒤 바꿀 수 있어요.'):showProfile();$('profileButton').onclick=$('navProfile').onclick;$('navGuide').onclick=$('fieldGuide').onclick=()=>showGuide();$('soundToggle').onclick=toggleMusic;$('brand').onclick=$('navHome').onclick=()=>{if(state?.phase==='active')toast('망량을 퇴치하고 결계를 완성해 주세요.');else resetHome()};$('skills').onclick=e=>{const b=e.target.closest('[data-skill]');if(b&&!b.disabled)cast(b.dataset.skill)};document.querySelectorAll('[data-clue]').forEach(b=>b.onclick=()=>investigate(Number(b.dataset.clue)));
document.addEventListener('visibilitychange',()=>battleClock.refresh());window.addEventListener('pagehide',()=>{stopBattleTasks();if(currentModal!=='result')resultShown=false;story.stop();stopCinematic();audioCtx?.suspend().catch(()=>{})});window.addEventListener('pageshow',()=>{if(view==='battle'&&state){if(state.phase==='active'){battleClock.start();battleMusic.start();unlockSound()}renderBattle()}});
initBattleView({onMove:performMove,onDirection:moveDirection,onWard:performWard,onWardBegin:performWardBegin,onWardInput:()=>{try{startWardInput(state,playerId)}catch(error){toast(error.message)}},onFocus:focusRitual,onRetreat:retreatBattle,refresh:renderBattle,onCinematicError:toast});
$('spellInput').onfocus=()=>{document.body.classList.add('ritual-typing')};$('spellInput').onblur=()=>{document.body.classList.remove('ritual-typing')};
[$('boardSvg'),$('moveControls')].forEach(el=>el.addEventListener('pointerdown',e=>{if(document.body.classList.contains('ritual-typing'))e.preventDefault()}));
$('skills').addEventListener('mouseover',e=>highlightRange(e.target.closest('[data-skill]')?.dataset.skill||''));$('skills').addEventListener('mouseleave',()=>highlightRange(''));
async function previewCinema(button,run,sound){if(busy||view==='battle')return;const label=button.textContent;button.disabled=true;button.textContent='준비 중…';try{if(await run())sfx(sound)}catch(error){toast(error.message)}finally{button.disabled=false;button.textContent=label}}
$('cinemaPreview').onclick=()=>previewCinema($('cinemaPreview'),()=>playUltimate({preview:true},{players:[profile]}),'ultimate');
$('enemyPreview').onclick=()=>previewCinema($('enemyPreview'),()=>playEnemyUltimate({preview:true}),'enemyUltimate');
$('redRiftPreview').onclick=()=>previewCinema($('redRiftPreview'),()=>playEnemyUltimate({preview:true,attack:'rupture'}),'redRift');
$('guardianPreview').onclick=()=>previewCinema($('guardianPreview'),()=>{const p={...profile,id:'guardian-preview',name:profile?.name||'瑞門'};return playGuardian({playerId:p.id,preview:true},{players:[p]},p.id)},'guardian');
refreshProfile();applyLocation();startParticles();homeStory();
