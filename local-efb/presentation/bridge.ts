import {presentationMode} from '../presentation-mode';
import {example,weights} from '../../local-extensions/flight';
import {getState,currentResult,reportHtml} from '../../local-extensions/state';
import {runtime} from '../../local-extensions/runtime-host';
import {store} from '../../build-common/src/systems/instruments/src/EFB/Store/store';
import type {Action,Bridge,Snapshot} from './types';

const W=window as any;
const delay=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
async function until<T>(read:()=>T|undefined|false,description:string,timeout=6000):Promise<T>{
 const end=Date.now()+timeout;
 while(Date.now()<end){const value=read();if(value)return value as T;await delay(60);}
 throw Error('未完成：'+description+'。可暂停检查页面后重试本步骤。');
}
const normal=(s:string)=>s.replace(/\s+/g,' ').trim();
const displayed=(e:HTMLElement)=>!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length);
function clearFocus(){document.querySelectorAll('.bid-demo-target').forEach(e=>e.classList.remove('bid-demo-target'));document.getElementById('bid-demo-cursor')?.remove();}
async function highlight(e:HTMLElement,fast=false){
 clearFocus();e.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
 e.classList.add('bid-demo-target');
 if(!fast){const r=e.getBoundingClientRect(),cursor=document.createElement('div');cursor.id='bid-demo-cursor';cursor.style.left=Math.max(16,Math.min(innerWidth-30,r.x+r.width/2))+'px';cursor.style.top=Math.max(16,Math.min(innerHeight-30,r.y+r.height/2))+'px';document.body.appendChild(cursor);await delay(240);}
}
function setValue(el:HTMLInputElement,value:string){
 const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;
 el.focus();setter.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));el.blur();
}
function snapshot():Snapshot{
 const s=getState(),w=weights(s.flight),r=currentResult(),native:any=store.getState(),sim=runtime.snapshot();
 const engineeringActive=!!document.querySelector('[data-testid="engineering-takeoff"]');
 const engineering=engineeringActive?W.__TAKEOFF_ENGINEERING__?.snapshot():undefined;
 const engineeringSolution=engineering?.valid?engineering.result?.solution:undefined;
 const tracking=native.trackingChecklists,selected=tracking?.selectedChecklistIndex||0;
 const defs=tracking?.aircraftChecklists?.[selected]?.items||[];
 const checkedItems=(tracking?.checklists?.[selected]?.items||[]).filter((x:any,i:number)=>x.completed&&!['LINE','SUBLISTHEADER'].includes(defs[i]?.type)).length;
 return {flightNumber:s.flight.number,route:`${s.flight.from} → ${s.flight.to}`,zfw:w.zfw,tow:w.tow,fuel:s.flight.rampKg,fuelTarget:Number(W.__LOCAL_EFB__.vars.get('L:A32NX_FUEL_DESIRED')||0),confirmed:!!s.confirmed,groundChanged:s.groundChanged,v2:s.result?.v2??null,valid:!!r,resultStatus:s.result?.status||'not-calculated',history:s.history.length,checkedItems,todAltitude:native.todCalculator?.currentAltitude??null,todTarget:native.todCalculator?.targetAltitude??null,landing:native.performance,notice:s.notice,gpuConnected:sim.gpuConnected,currentFuel:sim.fuelKg,currentPax:sim.pax,pushbackMetres:sim.pushbackMetres,activeFaults:sim.faults.length,lastCommandStatus:sim.commands[0]?.status||'none',weatherSource:s.flight.weather.source||'手工输入',engineeringActive,engineeringStatus:engineeringActive?(engineering?.status||'not-calculated'):'inactive',engineeringValid:!!engineering?.valid,engineeringMode:engineering?.mode??null,engineeringThrustMode:engineeringSolution?.thrustMode??null,engineeringV1:engineeringSolution?.v1Kt??null,engineeringVR:engineeringSolution?.vrKt??null,engineeringV2:engineeringSolution?.v2Kt??null,engineeringFlex:engineeringSolution?.assumedTemperatureC??null};
}
function artifacts(){
 const flight=JSON.stringify(getState().flight,null,2);
 if(document.querySelector('[data-testid="engineering-takeoff"]')){
  const api=W.__TAKEOFF_ENGINEERING__,engineering=api?.snapshot();
  const result=engineering?.valid?engineering.result:null;
  return {flight,result:result?JSON.stringify(result,null,2):null,report:result?api.report():null};
 }
 const result=currentResult();
 return {flight,result:result?JSON.stringify(result,null,2):null,report:result?reportHtml():null};
}
async function execute(action:Action,fast=false){
 if(!presentationMode)throw Error('演示桥只在独立演示会话中启用');
 switch(action.type){
  case 'nav':{
   clearFocus();W.__EFB_NAVIGATE(action.route);await delay(fast?80:240);
   await until(()=>document.querySelector(action.ready),'进入 '+action.route);
   const scroller=document.querySelector('.lf-root');if(scroller)scroller.scrollTop=0;break;
  }
  case 'field':{
   const input=await until(()=>document.querySelector<HTMLInputElement>(`[data-field="${action.name}"]`),'找到输入项 '+action.name);
   await highlight(input,fast);setValue(input,action.value);await delay(80);break;
  }
  case 'button':{
   const button=await until(()=>Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(e=>displayed(e)&&normal(e.textContent||'')===action.name&&!e.disabled),'可用按钮 '+action.name);
   await highlight(button,fast);button.click();await delay(100);break;
  }
  case 'import':{
   const input=await until(()=>document.querySelector<HTMLInputElement>('input[aria-label="导入航班 JSON"]'),'航班文件导入入口');
   await highlight(input.closest('label')!,fast);
   const before=getState();const transfer=new DataTransfer();transfer.items.add(new File([JSON.stringify(example(),null,2)],'DEMO330-flight.json',{type:'application/json'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
   await until(()=>getState()!==before&&getState().flight.number==='DEMO330'&&getState().flight.id==='LOCAL-DEMO-330','JSON 航班文件完成导入');break;
  }
  case 'focus':{
   const target=await until(()=>document.querySelector<HTMLElement>(action.selector),'显示关注区域');await highlight(target,fast);break;
  }
  case 'fuel':{
   const input=await until(()=>Array.from(document.querySelectorAll<HTMLInputElement>('input')).find(e=>displayed(e)&&e.type!=='range'&&Number(e.value)===snapshot().fuelTarget),'原生燃油目标输入框');
   await highlight(input,fast);setValue(input,String(action.value));
   await until(()=>snapshot().fuelTarget===action.value,'原生燃油目标变更');break;
  }
  case 'checklist':{
   const row=await until(()=>Array.from(document.querySelectorAll<HTMLElement>('div')).find(e=>normal(e.textContent||'')===action.item||normal(e.textContent||'')===action.item+' :'),'检查单项目 '+action.item);
   await highlight(row,fast);
   const native:any=store.getState();const tr=native.trackingChecklists;const idx=tr.aircraftChecklists[tr.selectedChecklistIndex].items.findIndex((i:any)=>i.item===action.item);
   if(!tr.checklists[tr.selectedChecklistIndex].items[idx].completed)row.click();
   await until(()=>{const t:any=store.getState();return t.trackingChecklists.checklists[tr.selectedChecklistIndex].items[idx].completed;},'检查项完成');break;
  }
  case 'nativeInputs':{
   for(let i=0;i<action.values.length;i++){
    const value=action.values[i];if(value===null)continue;
    const input=await until(()=>Array.from(document.querySelectorAll<HTMLInputElement>('input')).filter(e=>displayed(e)&&e.type!=='file')[i],'工具参数 '+(i+1));
    await highlight(input,fast);setValue(input,value);await delay(fast?50:160);
   }break;
  }
  case 'expect':{
   await until(()=>{const s=snapshot();return Object.entries(action.values).every(([k,v])=>typeof v==='number'?Math.abs(Number(s[k])-v)<0.00001:s[k]===v);},'页面业务状态核对');break;
  }
  case 'report':case 'closeReport':break; // Rendered by the outer presentation shell.
 }
}
if(presentationMode){
 const style=document.createElement('style');style.textContent='.bid-demo-target{outline:4px solid #54dcc6!important;outline-offset:4px;box-shadow:0 0 0 8px #54dcc624!important}#bid-demo-cursor{position:fixed;width:26px;height:26px;border:3px solid #54dcc6;border-radius:100%;background:#54dcc628;transform:translate(-50%,-50%);z-index:2147483646;pointer-events:none;box-shadow:0 0 0 8px #54dcc628}';document.head.appendChild(style);
 const banner=document.querySelector('#dev-banner span');if(banner)banner.textContent='A330 EFB · 本地样例演示 · 未连接飞行模拟器';
 document.querySelector('#dev-banner button')?.remove();
 const bridge:Bridge={ready:()=>!!W.__EFB_NAVIGATE&&!!document.querySelector('a[href="/dispatch"]')&&!document.querySelector('.local-wake-screen'),execute,snapshot,artifacts,clearFocus};
 W.__BID_DEMO__=bridge;
 window.addEventListener('keydown',e=>{if(e.key==='Escape')parent.postMessage({type:'efb-demo-pause'},location.origin);});
}
