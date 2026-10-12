import {enemyFor} from './enemies.js';
export const BOARD=7;
export const WARD_LENGTH=10;
export const WARD_WINDOW=5000,ULTIMATE_DURATION=3800,ULTIMATE_IMPACT=2500,ENEMY_CINEMATIC=3000,GUARDIAN_DURATION=4200;
export const PANEL_NAMES=['전면','우측','후면','좌측','천장','바닥'];
export const SKILLS={
 slash:{name:'파마',han:'斬',cost:0,cooldown:1700,range:2,desc:'두 칸 안의 망량을 베어냅니다. 가까이 갈수록 봉쇄에 주의하세요.',color:'ink'},
 talisman:{name:'주박',han:'符',cost:25,cooldown:5500,range:4,desc:'네 칸 안의 망량에게 부적을 날립니다. 망량의 바로 옆에서는 봉쇄됩니다.',color:'red'},
 barrier:{name:'결계',han:'結',cost:12,cooldown:700,range:99,desc:'새로운 한글 10글자 문장을 5초 안에 입력해 격자를 복구합니다.',color:'jade'},
 heal:{name:'회복',han:'癒',cost:25,cooldown:11000,range:99,desc:'자신의 체력을 35 회복합니다. 망량 곁에서는 봉쇄됩니다.',color:'gold'},
 ultimate:{name:'잔월 · 만상봉인',han:'極',cost:0,cooldown:24000,range:99,desc:'궁극 게이지 100으로 공간을 봉인하고 강한 피해를 줍니다.',color:'violet'}
};
export const distance=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
export const isEnemyUltimate=type=>type==='ultimate'||type==='rupture';
export const tileKey=p=>p.x+','+p.y;
export const inBoard=p=>Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=0&&p.x<BOARD&&p.y>=0&&p.y<BOARD;
export function obstacles(location){return location==='school'?[{x:1,y:1},{x:5,y:1},{x:1,y:3},{x:5,y:3}]:location==='shrine'?[{x:0,y:2},{x:6,y:2},{x:3,y:4}]:[]}
export function createPlayer(profile,now=Date.now(),index=0){return {...profile,hp:140,sp:100,damage:0,charge:0,position:{x:1,y:5},cooldowns:{},lockedUntil:0,movedAt:0,combo:0,tutorialStep:0,wardChallenge:null,usedWardKeys:[],lastWard:'',guardianUsed:false,guardianUntil:0,dodges:0,seenAt:now}}
export function makeState(player,now=Date.now(),mode='solo',location='city',difficulty='normal'){
 return {version:6,mode:'solo',location,difficulty,phase:'waiting',ownerId:player.id,players:[createPlayer(player,now)],bossHp:2200,bossMax:2200,boss:{x:3,y:2},ward:0,panels:Array.from({length:6},()=>({integrity:0})),startedAt:0,lastTick:now,nextAttack:0,attack:null,attackCount:0,combatEnabled:false,cinematicUntil:0,pendingUltimate:null,events:[],serial:0};
}
export function logEvent(s,type,text,extra={},now=Date.now()){s.events.push({id:++s.serial,type,text,at:now,...extra});s.events=s.events.slice(-55)}
export function startBattle(s,id,now=Date.now()){
 if(s.ownerId!==id||s.players.length!==1)throw Error('단독 전투를 새로 시작해 주세요.');
 if(s.phase!=='waiting')throw Error('이미 시작한 전투예요.');
 s.phase='active';s.startedAt=now;s.lastTick=now;s.bossMax=(s.difficulty==='hard'?2800:2200);s.bossHp=s.bossMax;s.players=s.players.map((p,i)=>({...createPlayer(p,now,i),hp:140-12*Math.max(0,Math.min(3,Number(p.exposure??s.exposure)||0))}));
 logEvent(s,'start','망량 · '+enemyFor(s.location).name+'이 움직이기 시작했다. 발밑의 경계를 살펴라.',{},now);return s;
}
const allTiles=()=>Array.from({length:49},(_,i)=>({x:i%7,y:Math.floor(i/7)}));
function nearest(s){return s.players.filter(p=>p.hp>0).sort((a,b)=>distance(a.position,s.boss)-distance(b.position,s.boss))[0]}
function calculateAttack(s,now){
 const p=nearest(s);if(!p)return;
 const turn=s.attackCount%3,type=s.attackCount%8===7?'rupture':s.attackCount%4===3?'ultimate':['pursuit','cross','curse'][turn];let target={...s.boss},cells=[];
 if(type==='pursuit'){
  const unavailable=new Set([...obstacles(s.location),...s.players.filter(x=>x.hp>0).map(x=>x.position)].map(tileKey));
  target=allTiles().filter(c=>distance(c,s.boss)<=2&&!unavailable.has(tileKey(c))).sort((a,b)=>distance(a,p.position)-distance(b,p.position)||distance(a,s.boss)-distance(b,s.boss))[0]||{...s.boss};
  cells=allTiles().filter(c=>distance(c,target)<=1);
 }else if(type==='ultimate'){
  const corner=[{x:0,y:0},{x:6,y:0},{x:0,y:6},{x:6,y:6}].sort((a,b)=>distance(b,s.boss)-distance(a,s.boss))[0];target=corner;cells=allTiles().filter(c=>distance(c,corner)>2);
 }else if(type==='rupture'){target={x:3,y:Math.max(2,Math.min(4,p.position.y))};cells=allTiles().filter(c=>Math.abs(c.y-target.y)<=1);
 }else if(type==='cross')cells=allTiles().filter(c=>c.x===s.boss.x||c.y===s.boss.y);
 else{target={...p.position};cells=allTiles().filter(c=>distance(c,target)<=1||c.x+c.y===target.x+target.y)}
 const fast=s.difficulty==='hard'?-.5:0,enraged=s.bossHp<s.bossMax*.4;
 s.attack={type,target,cells,moveCells:allTiles().filter(c=>distance(c,s.boss)<=2),landAt:now+(isEnemyUltimate(type)?ENEMY_CINEMATIC+4600:enraged?4200:5600)+fast*1000,panel:s.attackCount%6};s.nextAttack=s.attack.landAt;
 if(isEnemyUltimate(type)){pauseCinematic(s,now,ENEMY_CINEMATIC,false);logEvent(s,'enemyUltimate',type==='rupture'?'적월단공. 붉은 균열이 가로로 공간을 가른다. 세 줄의 반경 밖으로 피하라.':'흑천 · 백귀야행. 은빛 안전 칸으로 피하라.',{attack:type,duration:ENEMY_CINEMATIC,cells,...(type==='ultimate'?{safeCorner:target}:{riftRow:target.y})},now)}
 logEvent(s,'telegraph',type==='rupture'?'적월단공이 가로 세 줄을 베어 거둔다. 붉은 행 바깥으로 이동하라.':type==='ultimate'?'백귀야행이 전장을 삼킨다. 은빛 아홉 칸만 안전하다.':type==='pursuit'?'망량이 두 칸까지 접근한다. 붉은 범위에서 벗어나라.':type==='cross'?'십자형 원한이 퍼진다. 같은 행과 열을 피하라.':'그림자가 당신의 자리를 기억했다. 대각선 주박을 피하라.',{attack:type,cells},now);
}
function refreshWard(s){s.ward=Math.round(s.panels.reduce((a,p)=>a+p.integrity,0)/6)}
function checkClear(s,now){refreshWard(s);if(s.bossHp<=0&&!s.events.some(e=>e.type==='defeated')){s.attack=null;s.nextAttack=0;logEvent(s,'defeated','망량 퇴치. 여섯 면을 모두 이어 새로운 결계를 완성하라.',{},now)}if(s.bossHp<=0&&s.ward===100&&s.phase==='active'){s.phase='cleared';logEvent(s,'clear','당신이 세운 격자가 공간을 온전히 감쌌다.',{},now)}}
export function advance(s,now=Date.now()){
 if(s.phase!=='active'||s.version!==6)return s;
 const ticks=Math.max(0,Math.floor((now-s.lastTick)/1000));if(ticks){s.players.forEach(p=>p.sp=Math.min(100,p.sp+Math.min(ticks,30)*3));s.lastTick+=ticks*1000;}
 if(s.pendingUltimate&&s.pendingUltimate.releaseAt<=now){const u=s.pendingUltimate,p=s.players.find(x=>x.id===u.playerId),actual=Math.min(s.bossHp,u.damage);s.bossHp-=actual;if(p)p.damage+=actual;s.pendingUltimate=null;logEvent(s,'ultimateImpact','만상봉인 · '+actual+' 피해',{playerId:u.playerId,damage:actual,target:s.boss},now);checkClear(s,now)}
 if(s.cinematicUntil>now)return s;
 if(s.combatEnabled&&s.bossHp>0){
  if(!s.attack)calculateAttack(s,Math.max(now,s.cinematicUntil));
  else if(s.attack.landAt<=now){
   const attack=s.attack,damaging=new Set(attack.cells.map(tileKey)),enraged=s.bossHp<s.bossMax*.4;
   if(attack.type==='pursuit')s.boss={...attack.target};
   const panel=s.panels[attack.panel],protectedBefore=panel.integrity>0,breakAmount=isEnemyUltimate(attack.type)?85:enraged?65:45;
   for(const ix of isEnemyUltimate(attack.type)?[attack.panel,(attack.panel+1)%6,(attack.panel+2)%6]:[attack.panel]){const face=s.panels[ix];if(face.integrity>0){face.integrity=Math.max(0,face.integrity-breakAmount);logEvent(s,'wardBreak',PANEL_NAMES[ix]+' 격자가 공격을 받아 갈라졌다.',{panel:ix,amount:breakAmount},now)}}
   const hits=[],saved=[];for(const p of s.players){if(p.hp<=0)continue;if(damaging.has(tileKey(p.position))){
    const damage=(isEnemyUltimate(attack.type)?82:enraged?43:31)+(s.difficulty==='hard'?9:0),received=p.guardianUntil>now?0:protectedBefore?Math.ceil(damage*.4):damage;
    if(received>=p.hp&&!p.guardianUsed){p.guardianUsed=true;p.hp=70;p.lockedUntil=0;p.guardianUntil=now+GUARDIAN_DURATION+4000;saved.push(p.id);hits.push({playerId:p.id,damage:0,protected:true,position:p.position});}
    else{p.hp=Math.max(0,p.hp-received);if(received){p.lockedUntil=now+(['curse','ultimate','rupture'].includes(attack.type)?4200:2100);p.combo=0;}hits.push({playerId:p.id,damage:received,protected:received===0,position:p.position});}
   }else{p.dodges++;p.charge=Math.min(100,p.charge+12);if(p.tutorialStep===3){p.tutorialStep=4;p.charge=Math.max(80,p.charge)}}
   }
   if(attack.type==='rupture')for(const p of s.players){if(p.hp<=0||!damaging.has(tileKey(p.position)))continue;const to={x:p.position.x,y:p.position.y+Math.sign(attack.target.y-p.position.y)};if(tileKey(to)!==tileKey(s.boss)&&!obstacles(s.location).some(c=>tileKey(c)===tileKey(to)))p.position=to;}
   logEvent(s,'enemy',hits.length?'원한의 반경이 겹쳤다. 피해와 술식 봉쇄!':'공격을 비껴냈다. 다음 이동을 준비하라.',{attack:attack.type,hits,cells:attack.cells,target:s.boss},now);s.attackCount++;s.attack=null;refreshWard(s);
   if(s.players.every(p=>p.hp<=0)){s.phase='failed';logEvent(s,'failed','경계가 무너졌다. 이동과 결계를 다시 준비하라.',{},now)}else if(saved.length){pauseCinematic(s,now,GUARDIAN_DURATION);logEvent(s,'guardian','초대 무녀 서문단이 당신을 손 안에 거두었다. 시조의 가호 · 체력 70으로 회복',{playerId:saved[0],playerIds:saved,duration:GUARDIAN_DURATION,hp:70},now)}else calculateAttack(s,now);
  }
 }
 for(const p of s.players){if(distance(p.position,s.boss)<=1&&s.bossHp>0&&!(p.guardianUntil>now))p.lockedUntil=Math.max(p.lockedUntil,now+1000);if(p.tutorialStep===4&&p.charge>=100)p.tutorialStep=5;}
 checkClear(s,now);return s;
}
function activePlayer(s,id,now){advance(s,now);if(s.phase!=='active')throw Error('진행 중인 전투가 아니에요.');const p=s.players.find(p=>p.id===id);if(!p)throw Error('퇴마사를 찾지 못했어요.');if(p.hp<=0)throw Error('기운을 다했어요. 의뢰를 다시 시작해 주세요.');if(s.cinematicUntil>now)throw Error('궁극기 연출 중이에요.');return p}
export function movePlayer(s,id,to,now=Date.now()){
 const p=activePlayer(s,id,now);if(!inBoard(to)||distance(p.position,to)!==1)throw Error('인접한 한 칸으로 이동하세요.');
 if(now-p.movedAt<380)throw Error('다음 발걸음을 준비 중이에요.');
 if(obstacles(s.location).some(c=>tileKey(c)===tileKey(to)))throw Error('장애물이 있는 칸이에요.');
 if(s.bossHp>0&&tileKey(s.boss)===tileKey(to))throw Error('망량이 차지한 칸이에요.');
 const from={...p.position};p.position={x:to.x,y:to.y};p.movedAt=now;p.charge=Math.min(100,p.charge+2);if(p.tutorialStep===0)p.tutorialStep=1;
 if(distance(p.position,s.boss)<=1&&s.bossHp>0&&!(p.guardianUntil>now)){p.lockedUntil=now+1100;logEvent(s,'locked','망량의 한 칸 반경 안에 들어갔다. 공격 술식 봉쇄.',{playerId:id},now)}
 logEvent(s,'move',p.name+' 이동', {playerId:id,position:p.position,from},now);return s;
}
export function normalizeSpell(spell){return String(spell||'').normalize('NFC').replace(/[\s.!?。！？]/g,'')}
// A deterministic sentence-form check, not a semantic language model.
export function wardSentence(spell,used=[]){
 const text=typeof spell==='string'?spell.normalize('NFC').trim().replace(/\s+/g,' '):'',key=normalizeSpell(text),count=(key.match(/[가-힣]/g)||[]).length;
 const fail=reason=>({ok:false,text,key,count,reason});
 if(!text)return fail('공백을 제외한 한글 10글자 문장을 써 주세요.');
 if(!/^[가-힣 ]+[.!?。！？]?$/.test(text))return fail('자음·모음만 쓰지 말고 완성된 한글로 적어 주세요.');
 if(count!==WARD_LENGTH)return fail('공백·문장부호를 빼고 정확히 10글자여야 해요.');
 // Accept natural spacing or an unspaced sentence ending; do not grade grammar.
 if(!text.includes(' ')&&!/(다|요|라|자|네|지|까|어|게|오|냐|군|줘|니|리|렴|마|나|소|세|죠|아|임|음|함|됨|걸|데|가|와|해|돼|봐|켜|워|려|듯|야|든|대)[.!?。！？]?$/.test(text))return fail('문장으로 적어 주세요. 띄어쓰기 없이도 문장 끝맺음이 있으면 됩니다.');
 if(new Set(key).size<4)return fail('같은 글자를 반복하지 말고 문장을 써 주세요.');
 if(used.includes(key))return fail('이번 전투에 이미 쓴 문장이에요. 다른 문장을 써 주세요.');
 return {ok:true,text,key,count,reason:'새 문장입니다. 완성하면 결계가 이어집니다.'};
}
function pauseCinematic(s,now,duration,delayAttack=true){
 s.cinematicUntil=now+duration;if(delayAttack&&s.attack)s.attack.landAt+=duration;s.nextAttack=s.attack?.landAt||0;
 for(const p of s.players)if(p.wardChallenge&&p.wardChallenge.expiresAt>now){p.wardChallenge.expiresAt+=duration;p.wardChallenge.startedAt+=duration;}
}
export function beginWard(s,id,panelIndex,now=Date.now(),awaitInput=false){
 const p=activePlayer(s,id,now);
 if(!Number.isInteger(panelIndex)||panelIndex<0||panelIndex>5)throw Error('결계의 면을 선택하세요.');
 if(s.panels[panelIndex].integrity>=100)throw Error('이 면은 완성됐어요. 다른 면을 선택하세요.');
 if(p.wardChallenge&&(p.wardChallenge.expiresAt===null||p.wardChallenge.expiresAt>=now))throw Error('지금 문장을 5초 안에 완성해 주세요.');
 if(p.wardChallenge)p.combo=0;
 p.wardChallenge={panel:panelIndex,startedAt:awaitInput?null:now,expiresAt:awaitInput?null:now+WARD_WINDOW};return s;
}
export function startWardInput(s,id,now=Date.now()){
 const p=activePlayer(s,id,now);if(!p.wardChallenge)throw Error('먼저 문장 쓰기를 시작하세요.');
 if(p.wardChallenge.expiresAt===null){p.wardChallenge.startedAt=now;p.wardChallenge.expiresAt=now+WARD_WINDOW;}return s;
}
export function castWard(s,id,spell,panelIndex,now=Date.now()){
 const p=activePlayer(s,id,now),challenge=p.wardChallenge;
 if(!challenge)throw Error('먼저 문장 쓰기를 시작하세요.');
 if(challenge.expiresAt===null)throw Error('첫 글자를 입력하면 5초가 시작됩니다.');
 if(now>challenge.expiresAt){p.wardChallenge=null;p.combo=0;throw Error('5초가 지났어요. 문장 쓰기를 다시 시작하세요.');}
 if(panelIndex!==challenge.panel)throw Error('주문을 시작할 때 선택한 면에 이어 주세요.');
 const sentence=wardSentence(spell,p.usedWardKeys);if(!sentence.ok)throw Error(sentence.reason);
 if((p.cooldowns.barrier||0)>now)throw Error('주문이 아직 이어지는 중이에요.');
 if(p.sp<12)throw Error('영력이 부족해요. 잠시 숨을 고르세요.');
 if(s.panels[panelIndex].integrity>=100)throw Error('이 면은 완성됐어요. 다른 면을 선택하세요.');
 p.wardChallenge=null;p.sp-=12;p.cooldowns.barrier=now+700;p.combo++;p.charge=Math.min(100,p.charge+10);
 const gain=p.combo>=3?65:50;s.panels[panelIndex].integrity=Math.min(100,s.panels[panelIndex].integrity+gain);p.usedWardKeys.push(sentence.key);p.lastWard=sentence.text;
 if(p.tutorialStep===1)p.tutorialStep=2;
 logEvent(s,'ward',p.name+' · '+PANEL_NAMES[panelIndex]+' 격자 +'+gain,{playerId:id,panel:panelIndex,gain,combo:p.combo,spell:sentence.text},now);checkClear(s,now);return s;
}
export function useSkill(s,id,skill,now=Date.now(),random=Math.random){
 const p=activePlayer(s,id,now),k=Object.hasOwn(SKILLS,skill)?SKILLS[skill]:null;if(!k||skill==='barrier')throw Error('결계는 주문을 입력해 세워 주세요.');
 if(skill==='talisman'&&p.tutorialStep<2)throw Error('먼저 한 칸 이동하고 결계를 세워 주세요.');
 if(['slash','ultimate'].includes(skill)&&p.tutorialStep<3)throw Error('먼저 부적으로 망량의 기운을 드러내세요.');
 if((p.cooldowns[skill]||0)>now)throw Error('재사용 대기 중이에요.');
 if(skill!=='slash'&&p.lockedUntil>now&&s.bossHp>0)throw Error('술식이 봉쇄됐어요. 망량의 반경에서 벗어나세요.');
 if(p.sp<k.cost)throw Error('영력이 부족해요.');
 if(s.bossHp<=0&&skill!=='heal')throw Error('망량을 퇴치했어요. 여섯 면의 결계를 완성하세요.');
 if(['slash','talisman'].includes(skill)&&distance(p.position,s.boss)>k.range)throw Error(k.range+'칸 사거리 안으로 이동하세요.');
 if(skill==='ultimate'&&p.charge<100)throw Error('궁극 게이지를 100까지 모으세요.');
 p.sp-=k.cost;p.cooldowns[skill]=now+k.cooldown;let damage=0;
 if(skill==='heal')p.hp=Math.min(140,p.hp+35);
 else if(skill==='ultimate'){damage=Math.min(720,s.bossHp);s.pendingUltimate={playerId:id,damage,releaseAt:now+ULTIMATE_IMPACT};}
 else{damage=skill==='slash'?65+Math.floor(random()*21):skill==='talisman'?145+Math.floor(random()*26):720;damage=Math.min(damage,s.bossHp);s.bossHp-=damage;p.damage+=damage;p.charge=Math.min(100,p.charge+(skill==='slash'?13:20));}
 if(skill==='talisman'&&p.tutorialStep===2){p.tutorialStep=3;if(!s.combatEnabled){s.combatEnabled=true;calculateAttack(s,now)}}
 if(skill==='ultimate'){
  p.charge=0;p.tutorialStep=6;pauseCinematic(s,now,ULTIMATE_DURATION);
  s.panels.forEach(panel=>{if(panel.integrity>0)panel.integrity=Math.min(100,panel.integrity+20)});
 }
 logEvent(s,skill==='ultimate'?'ultimate':'skill',p.name+' · '+k.name+(damage?'  '+damage+' 피해':'  체력 회복'),{playerId:id,skill,damage,position:p.position,target:s.boss,...(skill==='ultimate'?{duration:ULTIMATE_DURATION}: {})},now);checkClear(s,now);return s;
}
