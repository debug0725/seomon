// No timer runs on the home page, after combat, or while the tab is hidden.
export function createBattleClock({tick,canRun,schedule=setTimeout,cancel=clearTimeout,interval=200}){
 let timer=null,running=false,generation=0;
 const clear=()=>{generation++;if(timer!==null)cancel(timer);timer=null};
 const queue=()=>{if(running&&canRun()&&timer===null){const stamp=generation;timer=schedule(()=>run(stamp),interval)}};
 function run(stamp){if(stamp!==generation)return;timer=null;if(!running||!canRun())return;tick();queue()}
 return {start(){running=true;queue()},refresh(){clear();if(running&&canRun()){tick();queue()}},stop(){running=false;clear()}};
}
