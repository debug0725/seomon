import {wardSentence} from './engine.js';

// Korean keyboards can keep the final complete syllable in composition until
// Enter or blur. Accept the displayed sentence; never wait for compositionend.
export function bindWardInput({input,form,getPlayer,onStart,onSubmit,onStatus}){
 const check=submit=>{
  const p=getPlayer();
  if(!p?.wardChallenge||input.disabled)return;
  if(input.value.trim()&&p.wardChallenge.expiresAt===null)onStart();
  onStatus(p);
  if(submit&&wardSentence(input.value,p.usedWardKeys).ok)onSubmit(input.value,p.wardChallenge.panel);
 };
 input.addEventListener('input',()=>check(true));
 input.addEventListener('compositionend',()=>check(true));
 form.onsubmit=e=>{e.preventDefault();check(true)};
}
