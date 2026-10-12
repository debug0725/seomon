// One cancellable dialogue timeline. Profile names and dialogue are plain text.
export function createDialogue({panel,speaker,text,next,choices,skip,announce,reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches,hidden=()=>document.hidden,schedule=setTimeout,cancel=clearTimeout}){
 let generation=0,timer=null,lines=[],index=0,glyphs=[],cursor=0,options={},settled=true;
 const clear=()=>{if(timer!==null)cancel(timer);timer=null};
 const reveal=()=>{clear();cursor=glyphs.length;text.textContent=glyphs.join('');panel.classList.remove('typing');announce.textContent=speaker.textContent+'。'+text.textContent;renderActions()};
 function renderActions(){
  choices.replaceChildren();const final=index===lines.length-1,actions=final?options.choices:[],stamp=generation;
  next.hidden=!!actions?.length;next.textContent=final?(options.endLabel||'계속 ✦'):'다음 ✦';
  for(const action of actions||[]){const button=document.createElement('button');button.type='button';button.className=action.primary?'story-choice primary':'story-choice secondary';button.textContent=action.label;button.onclick=()=>{if(stamp!==generation||settled)return;settled=true;clear();choices.querySelectorAll('button').forEach(b=>b.disabled=true);action.run?.()};choices.appendChild(button)}
 }
 function tick(g){if(g!==generation||settled)return;timer=null;if(hidden()){timer=schedule(()=>tick(g),150);return}cursor++;text.textContent=glyphs.slice(0,cursor).join('');if(cursor===glyphs.length)reveal();else timer=schedule(()=>tick(g),27)}
 function line(){clear();const stamp=generation;choices.replaceChildren();speaker.textContent=lines[index].speaker||'瑞門錄';glyphs=Array.from(lines[index].text||'');cursor=0;text.textContent='';announce.textContent='';next.hidden=false;next.textContent='펼쳐 읽기 ✦';panel.classList.remove('story-enter');void panel.offsetWidth;panel.classList.add('story-enter','typing');if(reducedMotion()||!glyphs.length)reveal();else timer=schedule(()=>tick(stamp),27)}
 function advance(){if(settled)return;if(cursor<glyphs.length){reveal();return}if(index<lines.length-1){index++;line();return}if(options.choices?.length)return;settled=true;clear();next.hidden=true;const complete=options.onComplete;options={};complete?.()}
 next.onclick=advance;text.onclick=()=>{if(cursor<glyphs.length)reveal()};
 skip.onclick=()=>{if(settled)return;index=lines.length-1;glyphs=Array.from(lines[index].text||'');speaker.textContent=lines[index].speaker||'瑞門錄';reveal();if(!options.choices?.length)advance()};
 return {play(script,config={}){generation++;clear();lines=script;index=0;options=config;settled=false;panel.hidden=false;if(!lines.length){settled=true;config.onComplete?.();return}line()},advance,stop(){generation++;clear();settled=true;options={};choices.replaceChildren();panel.classList.remove('typing');panel.hidden=true},get busy(){return !settled}};
}
