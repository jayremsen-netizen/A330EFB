import './style.css';
import './narrow.css';
import {scenarios} from './scenarios';
import type {Bridge,Scenario,Snapshot,Step} from './types';

const params=new URLSearchParams(location.search);
let scenario:Scenario=scenarios.find(s=>s.id===params.get('scenario'))||scenarios[0];
let index=0,actionIndex=0,generation=0,remaining=0,playing=false,busy=true,completed=false,failed=false;
let speed=[.65,1,2].includes(Number(params.get('speed')))?Number(params.get('speed')):1;
let voice=false,bridge:Bridge|undefined,lastSnapshot:Snapshot|undefined;
type RecordEntry={step:string;title:string;time:string;mode:string;status:string;snapshot?:Snapshot;error?:string};
let records:RecordEntry[]=[];
const W=window as any;
const sleep=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
document.getElementById('demo-app')!.innerHTML=`
 <header class="masthead"><div class="brand"><span class="brand-mark">A330</span><div><h1>电子飞行包 · 功能演示</h1><p>HEADWIND EFB / INTERACTIVE DEMONSTRATION</p></div></div><div class="header-actions"><label class="scene-label">场景 <select id="scenario">${scenarios.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select></label><button id="materials">演示资料</button><button id="fullscreen" title="进入全屏">全屏</button></div></header>
 <main class="workspace"><section class="stage" aria-label="实际运行的 EFB"><div class="stage-heading"><span><i class="live-dot"></i> 实际程序画面</span><span>本地样例 · 独立演示会话</span></div><div class="screen"><iframe id="efb" title="Headwind A330 电子飞行包" allow="fullscreen"></iframe><div id="loading" class="loading"><div class="spinner"></div><strong id="loading-text">正在启动 EFB…</strong><span>加载完成后自动进入演示</span></div></div><div class="stage-footer"><span id="flight-status">DEMO330 · ZUTF → ZSPD</span><span id="interaction-status">自动操作时，绿色边框标识关注区域</span></div></section>
 <aside class="narration"><div class="chapter" id="chapter"></div><div class="step-counter" id="step-counter"></div><h2 id="step-title"></h2><p id="description"></p><div class="watch"><span>观察重点</span><p id="watch"></p></div><div class="facts"><div><span>起飞重量</span><strong id="tow">—</strong></div><div><span>V2 参考</span><strong id="v2">—</strong></div><div><span>当前结果</span><strong id="result-status">尚未计算</strong></div></div><div class="reference"><span>项目手册</span><p id="manual"></p></div><div class="boundary">浏览器本地演示，未连接飞行模拟器。性能数值为源码参考核算。</div></aside></main>
 <footer class="director"><div class="controls"><div class="transport"><button id="previous" title="定位上一节">← 上一节</button><button id="play" class="primary">开始演示</button><button id="next" title="定位下一节">下一节 →</button><button id="restart">↻ 重播</button></div><div class="preferences"><label>速度 <select id="speed"><option value="0.65">慢速</option><option value="1">标准</option><option value="2">快速</option></select></label><button id="voice" aria-pressed="false">语音：关</button><label class="loop-label"><input id="loop" type="checkbox"> 循环</label><span id="status" role="status">准备中</span></div></div><div class="timeline" id="timeline" aria-label="演示步骤"></div><div class="progress-track"><div id="progress"></div></div><div class="bottom-line"><span id="summary"></span><span>空格 暂停 / 继续 · Esc 暂停接管</span></div></footer>
 <dialog id="report-dialog" class="report-dialog"><div class="dialog-head"><div><strong>核算报告 · 实际生成</strong><span>本窗口随演示步骤自动关闭</span></div><div class="transport"><button id="report-pause">暂停讲解</button><button id="save-report">保存 HTML</button><button id="close-report">关闭预览</button></div></div><iframe id="report-frame" title="当前核算报告" sandbox="allow-same-origin"></iframe></dialog>
 <dialog id="materials-dialog"><div class="dialog-head"><strong>演示资料</strong><button id="close-materials">关闭</button></div><p>保存当前实际业务数据和本次演示记录。演示脚本与运行说明位于交付包的“演示”文件夹。</p><div class="artifact-grid"><button data-download="flight">航班输入 JSON</button><button data-download="result">核算结果 JSON</button><button data-download="report">核算报告 HTML</button><button data-download="record">演示执行记录 JSON</button><button data-download="script">场景脚本 JSON</button></div><p class="small" id="artifact-note"></p></dialog>
 <div id="error" class="error" role="alert" hidden><strong>演示已暂停</strong><p id="error-text"></p><button id="retry">重新执行本节</button><button id="dismiss-error">接管页面</button></div>`;
const frame=$<HTMLIFrameElement>('efb');
$<HTMLSelectElement>('scenario').value=scenario.id;
$<HTMLSelectElement>('speed').value=String(speed);
function current(){return scenario.steps[index];}
function closeReport(){$<HTMLDialogElement>('report-dialog').close();}
function speak(step:Step){if(!voice||!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const text=new SpeechSynthesisUtterance(step.title+'。'+step.description);text.lang='zh-CN';text.rate=Math.min(1.4,speed);speechSynthesis.speak(text);}
function renderStep(){
 const step=current();$('chapter').textContent=step.chapter;$('step-counter').textContent=String(index+1).padStart(2,'0')+' / '+String(scenario.steps.length).padStart(2,'0');
 const engineering=scenario.id==='takeoff';
 $('v2').previousElementSibling!.textContent=engineering?'工程 V2':'V2 参考';
 document.querySelector('.boundary')!.textContent=engineering?'起飞数值来自公开假设的工程模型，未经航空性能校准，仅用于投标演示。':'浏览器本地演示，未连接飞行模拟器。性能数值为源码参考核算。';
 $('step-title').textContent=step.title;$('description').textContent=step.description;$('watch').textContent=step.watch;$('manual').textContent=step.manual;$('summary').textContent=scenario.summary;
 $('timeline').innerHTML=scenario.steps.map((s,i)=>`<button data-step="${i}" title="${esc(s.title)}" aria-label="第 ${i+1} 节 ${esc(s.title)}" class="${i===index?'current':i<index?'past':''}"><span>${String(i+1).padStart(2,'0')}</span><em>${esc(s.title)}</em></button>`).join('');
 const active=$('timeline').querySelector<HTMLElement>('.current');if(active)$('timeline').scrollLeft=Math.max(0,active.offsetLeft-$('timeline').offsetLeft-10);
 renderControls();
}
function renderControls(){
 $('play').textContent=completed?'再次演示':playing?'Ⅱ 暂停接管':index===0&&actionIndex===0?'▶ 开始演示':'▶ 继续演示';
 $('report-pause').textContent=playing?'暂停讲解':'继续讲解';
 $('status').textContent=failed?'步骤未完成':busy?'正在准备':completed?'演示完成':playing?`自动演示 · ${Math.ceil(remaining/speed)} 秒`:'已暂停 · 可直接操作 EFB';
 $('interaction-status').textContent=playing?'绿色边框标识当前操作与关注区域':'可直接操作 EFB；继续演示将执行后续脚本';
 for(const id of ['play','previous','next','restart'])$<HTMLButtonElement>(id).disabled=busy;
 $<HTMLButtonElement>('previous').disabled=busy||index===0;
 $<HTMLButtonElement>('next').disabled=busy||index===scenario.steps.length-1;
 const step=current();const fraction=actionIndex>=step.actions.length?1-Math.min(1,remaining/step.seconds):0;
 $('progress').style.width=`${completed?100:(index+fraction)/scenario.steps.length*100}%`;
}
function updateSnapshot(){
 if(!bridge)return;try{lastSnapshot=bridge.snapshot();const s=lastSnapshot;
 $('tow').textContent=s.tow.toLocaleString('en-US')+' kg';
 if(scenario.id==='takeoff'){
  $('v2').textContent=typeof s.engineeringV2==='number'?s.engineeringV2.toFixed(1)+' kt':'—';
  const labels:Record<string,string>={'engineering-feasible':'工程模型可行','engineering-infeasible':'工程模型不可行',unsupported:'超出模型范围',invalid:'输入无效',stale:'结果已过期',calculating:'计算中'};
  $('result-status').textContent=labels[String(s.engineeringStatus)]||'尚未计算';$('result-status').className=s.engineeringValid?'good':s.engineeringStatus==='stale'?'warning':'';
 }else{
  $('v2').textContent=s.v2===null?'—':s.v2.toFixed(1)+' kt';
  $('result-status').textContent=s.valid?'参考结果有效':s.v2!==null?'结果已过期':'尚未计算';$('result-status').className=s.valid?'good':s.v2!==null?'warning':'';
 }
 $('flight-status').textContent=s.flightNumber+' · '+s.route+' · 历史 '+s.history+' 条';
 }catch{/* The child is briefly unavailable while resetting its document. */}
}
function pause(){playing=false;if('speechSynthesis'in window)speechSynthesis.cancel();renderControls();}
function fail(e:unknown){playing=false;busy=false;failed=true;$('loading').hidden=true;$('error').hidden=false;$('error-text').textContent=e instanceof Error?e.message:String(e);records.push({step:current().id,title:current().title,time:new Date().toISOString(),mode:'演示',status:'失败',snapshot:lastSnapshot,error:String(e)});renderControls();}
async function connect(ticket:number,session:string){
 const deadline=Date.now()+25000;
 while(Date.now()<deadline){if(ticket!==generation)throw Error('cancelled');const child=frame.contentWindow as any;const b=child?.location.search.includes('session='+session)?child.__BID_DEMO__ as Bridge|undefined:undefined;if(b?.ready())return b;await sleep(100);}
 throw Error('EFB 未在 25 秒内完成启动。请确认本地服务正在运行，然后点击“重新执行本节”。');
}
async function perform(step:Step,from:number,fast:boolean,ticket:number){
 for(let a=from;a<step.actions.length;a++){
  if(ticket!==generation)return false;
  if(!fast){while(!playing&&ticket===generation)await sleep(100);if(ticket!==generation)return false;}
  const command=step.actions[a];
  if(command.type==='report'){
   const report=bridge!.artifacts().report;if(!report)throw Error('当前结果无效，无法生成报告。请重新确认重量并计算。');
   if(!fast){$<HTMLIFrameElement>('report-frame').srcdoc=report+'<style>button{display:none!important}</style>';$<HTMLDialogElement>('report-dialog').showModal();}
  }else if(command.type==='closeReport')closeReport();else await bridge!.execute(command,fast);
  if(ticket!==generation)return false;
  if(!fast)actionIndex=a+1;
  updateSnapshot();
 }
 records.push({step:step.id,title:step.title,time:new Date().toISOString(),mode:fast?'定位复现':'演示',status:'完成',snapshot:bridge!.snapshot()});return true;
}
async function run(ticket:number){
 try{
  while(ticket===generation){
   while(!playing&&ticket===generation)await sleep(100);if(ticket!==generation)return;
   if(actionIndex===0){closeReport();speak(current());}
   if(actionIndex<current().actions.length){if(!await perform(current(),actionIndex,false,ticket))return;}
   let last=performance.now();
   while(remaining>0&&ticket===generation){await sleep(100);const now=performance.now();if(playing)remaining=Math.max(0,remaining-(now-last)/1000*speed);last=now;renderControls();}
   if(ticket!==generation)return;
   while(!playing&&ticket===generation)await sleep(100);if(ticket!==generation)return;
   if(index===scenario.steps.length-1){completed=true;playing=false;renderControls();if($<HTMLInputElement>('loop').checked){await sleep(900);if(ticket===generation)await reset(0,true,false);}return;}
   index++;actionIndex=0;remaining=current().seconds;renderStep();
  }
 }catch(e){if(ticket===generation)fail(e);}
}
const presentationOwner = crypto.randomUUID();
let previousSession = '';
async function reset(target=0,autoplay=false,reconstruct=true){
 const ticket=++generation;index=target;pause();busy=true;completed=false;failed=false;actionIndex=0;records=[];bridge=undefined;closeReport();$('error').hidden=true;
 $('loading-text').textContent=target>0?'正在定位场景并重建输入…':'正在启动独立演示会话…';$('loading').hidden=false;renderStep();
 // Replays clear only this controller's previous iframe. Other windows own different prefixes.
 if(previousSession){const prefix=`A339_BID_DEMO:${previousSession}:`;for(const key of Object.keys(localStorage))if(key.startsWith(prefix))localStorage.removeItem(key);}
 const session=presentationOwner+'-'+ticket;previousSession=session;frame.src='/?demo-session=1&reset=1&session='+session;
 try{
  bridge=await connect(ticket,session);
  if(reconstruct){for(let i=0;i<target;i++){if(!await perform(scenario.steps[i],0,true,ticket))return;}}
  if(ticket!==generation)return;
  remaining=current().seconds;busy=false;playing=autoplay;$('loading').hidden=true;renderStep();updateSnapshot();void run(ticket);
 }catch(e){if(ticket===generation)fail(e);}
}
function download(name:string,content:string,type:string){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function executionRecord(){return {schema:1,scenario:scenario.id,name:scenario.name,generated:new Date().toISOString(),completed,step:index+1,records,current:lastSnapshot,baseline:{headwind:'41eace79ed442696a6361dc72947954c9a6cf5cb',mode:'browser-demonstration'}};}
function saveArtifact(kind:string){
 const artifacts=bridge?.artifacts();const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 if(kind==='record')download('EFB-demo-record-'+stamp+'.json',JSON.stringify(executionRecord(),null,2),'application/json');
 else if(kind==='script')download('EFB-demo-scenarios.json',JSON.stringify(scenarios,null,2),'application/json');
 else if(artifacts){const data=artifacts[kind as keyof typeof artifacts];if(!data){$('artifact-note').textContent='当前结果无效，请先确认重量并计算，再保存核算结果或报告。';return;}download('DEMO330-'+kind+(kind==='report'?'.html':'.json'),data,kind==='report'?'text/html':'application/json');}
}
$('play').onclick=()=>{if(completed){void reset(0,true,false);return;}if(failed){void reset(index,true);return;}if(playing)pause();else{playing=true;renderControls();}};
$('previous').onclick=()=>void reset(index-1,true);
$('next').onclick=()=>void reset(index+1,true);
$('restart').onclick=()=>void reset(0,true,false);
$('retry').onclick=()=>void reset(index,true);
$('dismiss-error').onclick=()=>{$('error').hidden=true;};
$('timeline').onclick=e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-step]');if(b&&!busy)void reset(Number(b.dataset.step),true);};
$('scenario').onchange=()=>{scenario=scenarios.find(s=>s.id===$<HTMLSelectElement>('scenario').value)!;void reset(0,true,false);};
$('speed').onchange=()=>{speed=Number($<HTMLSelectElement>('speed').value);renderControls();};
$('voice').onclick=()=>{if(!('speechSynthesis'in window)){$('voice').textContent='浏览器不支持语音';return;}voice=!voice;$('voice').textContent='语音：'+(voice?'开':'关');$('voice').setAttribute('aria-pressed',String(voice));if(!voice)speechSynthesis.cancel();else if(playing)speak(current());};
$('fullscreen').onclick=()=>{if(document.fullscreenElement)void document.exitFullscreen();else void document.documentElement.requestFullscreen().catch(()=>{});};
$('materials').onclick=()=>{pause();$('artifact-note').textContent='资料保存在本机。执行记录包含实际结果快照与完成状态。';$<HTMLDialogElement>('materials-dialog').showModal();};
$('close-materials').onclick=()=>$<HTMLDialogElement>('materials-dialog').close();
$('materials-dialog').querySelectorAll<HTMLButtonElement>('[data-download]').forEach(b=>b.onclick=()=>saveArtifact(b.dataset.download!));
$('close-report').onclick=closeReport;
$('report-pause').onclick=()=>{if(playing)pause();else{playing=true;renderControls();}};
$('save-report').onclick=()=>saveArtifact('report');
$('report-dialog').addEventListener('cancel',()=>pause());
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===frame.contentWindow&&e.data?.type==='efb-demo-pause')pause();});
window.addEventListener('keydown',e=>{if(e.code==='Escape')pause();if(e.code==='Space'&&!['INPUT','SELECT','TEXTAREA','BUTTON'].includes((e.target as HTMLElement).tagName)){e.preventDefault();if(!busy)$('play').click();}});
setInterval(()=>{updateSnapshot();renderControls();},500);
// Read-only status and normal controls support repeatable local acceptance runs.
W.__BID_PRESENTATION__={status:()=>({scenario:scenario.id,index,actionIndex,remaining,playing,busy,completed,failed,snapshot:lastSnapshot}),record:executionRecord,scenarios,pause,play:()=>{$('play').click();},seek:(i:number)=>reset(i,true),select:(id:string)=>{const s=scenarios.find(s=>s.id===id);if(!s)throw Error('Unknown scenario');scenario=s;$<HTMLSelectElement>('scenario').value=id;return reset(0,true,false);},skipHold:()=>{if(actionIndex>=current().actions.length)remaining=0;}};
void reset(0,params.get('autoplay')==='1',false);
