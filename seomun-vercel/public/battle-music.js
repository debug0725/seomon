const VIDEO_ID='MseICUfFonA';
let apiPromise;
export function loadYouTubeAPI(win=window,doc=document){
 if(win.YT?.Player)return Promise.resolve(win.YT);
 if(apiPromise)return apiPromise;
 apiPromise=new Promise((resolve,reject)=>{
  let settled=false;const previous=win.onYouTubeIframeAPIReady;
  const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);script.onerror=null;if(win.onYouTubeIframeAPIReady===ready)win.onYouTubeIframeAPIReady=previous;if(error){script.remove();apiPromise=null;reject(error)}else resolve(win.YT)};
  const ready=()=>{try{previous?.()}finally{win.YT?.Player?finish():finish(Error('음악 플레이어를 준비하지 못했어요.'))}};
  const script=doc.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;script.referrerPolicy='strict-origin-when-cross-origin';
  const timer=setTimeout(()=>finish(Error('음악 연결이 늦어지고 있어요.')),10000);
  win.onYouTubeIframeAPIReady=ready;script.onerror=()=>finish(Error('음악을 연결하지 못했어요.'));doc.head.appendChild(script);
 });return apiPromise;
}
// One background player and one small control. Never block combat on music.
export function createBattleMusic({mount,status,control,onEnabled=()=>{},win=window,doc=document,loadAPI=()=>loadYouTubeAPI(win,doc)}){
 let enabled=true,active=false,ready=false,player=null,preparing=null,generation=0,userPaused=false,pausedByApp=false;
 const allowed=()=>active&&enabled&&!doc.hidden&&!userPaused;
 const message=(text,state)=>{
  status.textContent=text;if(state)control.dataset.music=state;
  const label=!enabled?'전투 음악 켜기':!active?'전투 음악 자동재생 켜짐 · 끄기':state==='playing'?'전투 음악 끄기':state==='failed'?'전투 음악 다시 연결':'전투 음악 재생';
  control.setAttribute('aria-label',label);control.setAttribute('title',label);control.setAttribute('aria-pressed',String(enabled));
 };
 const pause=()=>{pausedByApp=true;try{player?.pauseVideo()}catch{}};
 const play=()=>{if(ready&&allowed()&&player.getPlayerState?.()!==1){pausedByApp=false;message('전투 음악을 시작합니다.','loading');try{player.playVideo()}catch{message('작은 음악 버튼을 눌러 재생해 주세요.','blocked')}}};
 const prepare=()=>{
  if(!enabled)return Promise.resolve();
  if(player||preparing)return preparing||Promise.resolve();
  const stamp=generation;
  const task=loadAPI().then(YT=>{
   if(stamp!==generation)return;
   const iframe=doc.createElement('iframe');iframe.title='YouTube · 전투 음악';iframe.width='200';iframe.height='200';iframe.tabIndex=-1;iframe.setAttribute('aria-hidden','true');iframe.referrerPolicy='strict-origin-when-cross-origin';iframe.allow='autoplay; encrypted-media';
   const origin=win.location.origin;
   iframe.src='https://www.youtube-nocookie.com/embed/'+VIDEO_ID+'?enablejsapi=1&playsinline=1&controls=0&rel=0&loop=1&playlist='+VIDEO_ID+'&origin='+encodeURIComponent(origin);
   mount.replaceChildren(iframe);
   player=new YT.Player(iframe,{events:{
    onReady:e=>{if(stamp!==generation)return;player=e.target;ready=true;play()},
    onStateChange:e=>{if(stamp!==generation)return;if(e.data===1){if(!active||!enabled||doc.hidden){pause();return}userPaused=false;message('전투 음악 재생 중','playing')}else if(e.data===2){if(!pausedByApp)userPaused=true;message('전투 음악 일시 정지',enabled?'paused':'off')}},
    onAutoplayBlocked:()=>{if(stamp!==generation)return;message('소리를 시작하려면 작은 음악 버튼을 눌러 주세요.','blocked')},
    onError:()=>{if(stamp!==generation)return;ready=false;message('음악 연결이 제한되어 있어요. 작은 음악 버튼으로 다시 연결할 수 있습니다.','failed')}
   }});
  }).catch(()=>{if(stamp===generation)message('음악을 연결하지 못했어요. 작은 음악 버튼으로 다시 연결해 주세요.','failed');}).finally(()=>{if(preparing===task)preparing=null});
  preparing=task;return task;
 };
 const stop=()=>{active=false;generation++;pause();try{player?.destroy()}catch{}player=null;ready=false;preparing=null;userPaused=false;mount.replaceChildren();message('전투 시작 시 음악을 자동으로 재생합니다.',enabled?'idle':'off')};
 function toggle(){
  // A blocked autoplay attempt retries on the first tap, without toggling OFF.
  if(active&&enabled&&(!ready||player?.getPlayerState?.()!==1)){
   userPaused=false;
   if(!ready){try{player?.destroy()}catch{}player=null;mount.replaceChildren();generation++;preparing=null;message('음악 연결 중…','loading');prepare()}else play();
   return enabled;
  }
  enabled=!enabled;onEnabled(enabled);
  if(!enabled){pause();message('전투 음악과 효과음을 껐어요.','off')}
  else if(active){userPaused=false;message('음악 연결 중…','loading');prepare();play()}
  else message('전투 시작 시 음악을 자동으로 재생합니다.','idle');
  return enabled;
 }
 control.onclick=toggle;
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden)pause();else play()});
 message('전투 시작 시 음악을 자동으로 재생합니다.','idle');
 return {
  prepare,
  start(){active=true;userPaused=false;if(enabled){message('전투 음악 연결 중…','loading');prepare();play()}},
  stop,
  toggle,
  get enabled(){return enabled}
 };
}
