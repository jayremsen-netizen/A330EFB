import {useState,useEffect} from 'react';
import {Flight,example,validate,weights,signature,calculate,profile} from './flight';
import {store} from '../build-common/src/systems/instruments/src/EFB/Store/store';
import {initialState,setSimbriefData,setFuelImported,setPayloadImported} from '../build-common/src/systems/instruments/src/EFB/Store/features/simBrief';
import {storageName} from '../local-efb/presentation-mode';
import {restoreStored} from './persistence';
import {metarFor} from './weather';
import {initializeRuntime,runtime} from './runtime-host';
import {departureChanged} from './departure-review';
import {derivePlanning} from './planning-context';
import {setChecklistCompletion,setChecklistItemCompletion,setSelectedChecklistIndex} from '../build-common/src/systems/instruments/src/EFB/Store/features/checklists';
type Result=ReturnType<typeof calculate>;
type State={flight:Flight;confirmed:string;result:Result|null;history:Result[];notice:string;storageError:string;groundChanged:boolean;revision:number;storageConflict:boolean;hasRecovery:boolean};
const KEY=storageName('A339_LOCAL_FLIGHT_V1');
const recoveryPrefix=KEY+'_RECOVERY_';
let lastStored:string|null=null;
let state:State={flight:example(),confirmed:'',result:null,history:[],notice:'本地手工样例。请核对所有输入并保存确认。',storageError:'',groundChanged:false,revision:0,storageConflict:false,hasRecovery:false};
function preserve(raw:string){
 const existing=Object.keys(localStorage).filter(k=>k.startsWith(recoveryPrefix));
 if(!existing.some(k=>{try{return JSON.parse(localStorage.getItem(k)!).raw===raw;}catch{return false;}}))
  localStorage.setItem(recoveryPrefix+Date.now(),JSON.stringify({at:new Date().toISOString(),raw}));
 state.hasRecovery=true;
}
function restore(raw:string|null){
 if(!raw)return;
 try{const {data,issues}=restoreStored(raw);state={...state,...data,storageConflict:false,storageError:'',notice:issues.length?`已隔离 ${issues.length} 项异常内容，可以导出恢复备份。`:'已恢复本机航班草稿'};if(issues.length)preserve(raw);}
 catch(e){try{preserve(raw);}catch{state.storageConflict=true;}state.storageError='保存内容不能直接恢复，已保留原文，请导出恢复备份。'+String(e);}
}
try{lastStored=localStorage.getItem(KEY);restore(lastStored);state.hasRecovery=Object.keys(localStorage).some(k=>k.startsWith(recoveryPrefix));}catch(e){state.storageError='本机存储不可用。'+String(e);}
const listeners=new Set<Function>();
const esc=(v:any)=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function getState(){return state;}
function notify(){listeners.forEach(f=>f(state));}
function conflict(){state={...state,storageConflict:true,confirmed:'',notice:'另一个窗口已保存新版本。本窗口已停止写入；可导出当前草稿或读取最新版本。'};notify();}
function writable(){try{if(state.storageConflict||localStorage.getItem(KEY)!==lastStored){conflict();return false;}}catch{}return true;}
function publish(){
 if(!writable())return;
 state={...state,revision:state.revision+1,storageError:''};
 try{const raw=JSON.stringify(state);localStorage.setItem(KEY,raw);lastStored=raw;}
 catch(e){state={...state,storageError:'本地保存失败，请导出航班文件。'+String(e)};}
 notify();
}
export const useLocal=()=>{const [s,set]=useState(state);useEffect(()=>{listeners.add(set);return()=>{listeners.delete(set);};},[]);return s;};
function resetFlightSession(f:Flight){
 const checklists=store.getState().trackingChecklists.checklists;
 checklists.forEach((c,checklistIndex)=>{c.items.forEach((_,itemIndex)=>store.dispatch(setChecklistItemCompletion({checklistIndex,itemIndex,completionValue:false})));store.dispatch(setChecklistCompletion({checklistIndex,completion:false}));});
 store.dispatch(setSelectedChecklistIndex(0));store.dispatch(setSimbriefData(structuredClone(initialState.data)));store.dispatch(setFuelImported(false));store.dispatch(setPayloadImported(false));
 runtime.startFlight(f);
}
export function editFlight(f:Flight){
 if(!writable())return;
 const newFlight=f.id!==state.flight.id,airportChanged=f.from!==state.flight.from;
 f=departureChanged(state.flight,f);
 if(newFlight)resetFlightSession(f);
 else if(f.planning){const data=structuredClone(store.getState().simbrief.data);data.loadsheet='<div style="padding:30px;color:#111;background:#fff"><h1>工程计划已修改，签派资料待重新确认</h1><p>请核对航路燃油、配载及航班重量，再保存确认。上一版签派结果已撤销。</p></div>';data.weights.estLandingWeight='';Object.assign(data,{flightDistance:'',flightETAInSeconds:'',tripTime:0,schedIn:''});Object.assign(data.fuels,{planLanding:0,enrouteBurn:0});store.dispatch(setSimbriefData(data));}
 state={...state,flight:f,confirmed:'',result:newFlight?null:state.result,groundChanged:false,notice:[newFlight?'已开始新航班；检查单清空，地面会话复位至停机状态（5000 kg 燃油、0 人、0 货物），故障与旧请求已清除。':'输入已修改，旧结果已失效，请重新确认并计算。',airportChanged?'起飞机场已变化；旧天气和跑道资料保留供核对，两项均须重新复核。':'请核对并确认当前计划。'].join('')};publish();
}
export function loadFlight(f:Flight){const errors=validate(f);if(errors.length)throw Error(errors.join('；'));editFlight({...f,source:f.source==='local-example'?'local-example':'local-file'});}
export function confirmFlight(){if(!writable())return false;const errors=validate(state.flight);if(errors.length){state={...state,notice:errors.join('；')};publish();return false;}state={...state,confirmed:signature(state.flight),groundChanged:false,notice:'本地航班与重量已确认，并同步到仪表盘、签派和地面目标数据。'};applyToEfb(state.flight);publish();return true;}
export function runCalculation(){if(!writable())return;if(state.confirmed!==signature(state.flight)||state.groundChanged){state={...state,notice:'请先保存并确认当前航班重量；地面目标变更后需要重新确认。'};publish();return;}state={...state,result:calculate(state.flight),notice:'本地核算完成。速度仅为未校准源码表参考；不构成可起飞判定。'};publish();}
export function currentResult(){return !state.storageConflict&&state.result&&state.result.signature===signature(state.flight)&&state.confirmed===signature(state.flight)&&!state.groundChanged&&state.result.status==='reference-only'?state.result:null;}
export function archiveResult(){const r=currentResult();if(!r)throw Error('仅能保存当前有效的参考核算记录');state={...state,history:[r,...state.history].slice(0,20),notice:'参考核算已保存到本机历史（最多 20 条）'};publish();}
export function restoreHistory(i:number){const r=state.history[i];if(!r)throw Error('记录不存在');loadFlight(structuredClone(r.input));}
export function notice(message:string){state={...state,notice:message};notify();}
export function markGroundChanged(){if(state.confirmed&&!state.groundChanged){state={...state,groundChanged:true,notice:'地面目标发生变化，计算已失效。请在本地航班中核对并重新确认计划重量。'};publish();}}
export function adoptLatest(){const previousId=state.flight.id;lastStored=localStorage.getItem(KEY);state={...state,storageConflict:false};restore(lastStored);if(!lastStored){state={...state,confirmed:'',result:null,history:[],notice:'保存内容已清除，当前草稿保留，请重新确认。'};}if(previousId!==state.flight.id){resetFlightSession(state.flight);state={...state,notice:'已读取另一航班，检查单与地面会话已复位，故障已清除。'};}if(state.confirmed===signature(state.flight)&&!state.storageConflict)applyToEfb(state.flight);notify();}
export function exportRecovery(){const data=Object.keys(localStorage).filter(k=>k.startsWith(recoveryPrefix)).map(k=>({key:k,content:localStorage.getItem(k)}));if(!data.length&&lastStored)data.push({key:KEY,content:lastStored});download('a330efb-recovery.json',data);}
export function readFuelTarget(){const n=(window as any).__LOCAL_EFB__?.vars.get('L:A32NX_FUEL_DESIRED');if(!Number.isFinite(n)||n<0)throw Error('没有可用地面燃油目标');editFlight({...state.flight,rampKg:n});}
export function applyToEfb(f:Flight){
 const w=weights(f),data=structuredClone(initialState.data);const out=String(Date.parse(f.date+'T08:00:00Z')/1000);
 const planning=derivePlanning(f),fuel=planning.fuel?.status==='engineering-feasible'?planning.fuel:null;
 Object.assign(data,{airline:'',flightNum:f.number,departingAirport:f.from,departingRunway:f.runway.ident,departingIata:f.from,departingName:'本地航班 / 手工资料',arrivingAirport:f.to,arrivingRunway:'',arrivingIata:f.to,arrivingName:'本地航班 / 手工资料',aircraftIcao:'A339',aircraftReg:'LOCAL-A339',flightDistance:'0',flightETAInSeconds:'10800',cruiseAltitude:35000,units:'kgs',route:f.route,costInd:'30',altIcao:f.alternate,altIata:f.alternate,tripTime:10800,schedOut:out,schedIn:String(Number(out)+10800)});
 data.loadsheet=`<div style="padding:30px;background:#fff;color:#111"><h1 style="color:#111">LOCAL FLIGHT / 本地航班 ${esc(f.number)}</h1><p style="color:#111">${esc(f.date)} · ${esc(f.from)} → ${esc(f.to)} · A330-941</p><p style="color:#111">SOURCE: ${esc(f.source)} / 本地手工计划，非实际签派文件</p><p style="color:#111">${esc(f.route)}</p><p style="color:#111">OEW ${w.zfw-w.payload} kg + PAYLOAD ${w.payload} kg = ZFW ${w.zfw} kg</p><p style="color:#111">RAMP FUEL ${f.rampKg} kg - TAXI ${f.taxiKg} kg</p><p style="color:#111">TOW ${w.tow} kg · PAX ${f.pax}</p><p style="color:#111">本地计划为重量核算来源；实际模拟器状态未连接。</p></div>`;
 Object.assign(data.weights,{cargo:String(f.pax*f.bagKg+f.freightKg),estLandingWeight:String(w.tow),estTakeOffWeight:String(w.tow),estZeroFuelWeight:String(w.zfw),maxLandingWeight:'191000',maxTakeOffWeight:'251000',maxZeroFuelWeight:'181000',bagCount:String(f.pax),passengerCount:String(f.pax),passengerWeight:String(f.paxKg),bagWeight:String(f.bagKg),payload:String(w.payload),freight:String(f.freightKg)});
 Object.assign(data.fuels,{planRamp:f.rampKg,planTakeOff:f.rampKg-f.taxiKg,taxi:f.taxiKg,planLanding:0,enrouteBurn:0});data.weather={avgWindDir:String(f.weather.windDir),avgWindSpeed:String(f.weather.windKt)};
 if(f.planning&&!fuel){data.weights.estLandingWeight='';Object.assign(data,{flightDistance:'',flightETAInSeconds:'',tripTime:0,schedIn:''});data.loadsheet+='<div style="padding:30px;color:#111;background:#fff"><h2>燃油预算未通过</h2><p>当前条件尚不能生成预计着陆重量和到达时间。请返回航路燃油页修正预算；基础重量确认不等于工程计划可用。</p></div>';}
 if(fuel?.planned&&fuel.totals){
  const duration=Math.round(fuel.totals.tripMinutes*60);
  Object.assign(data,{flightDistance:String(fuel.totals.tripDistanceNm),flightETAInSeconds:String(duration),tripTime:duration,schedIn:String(Number(out)+duration),cruiseAltitude:f.planning!.fuel!.cruiseAltitudeFt});
  data.weights.estLandingWeight=String(fuel.planned.destinationLandingMassKg);
  Object.assign(data.fuels,{planLanding:fuel.planned.destinationLandingFuelKg,enrouteBurn:fuel.totals.tripKg});
  data.loadsheet+=`<div style="padding:30px;color:#111;background:#fff"><h2>工程航路与配载补充</h2><p>航路 ${fuel.totals.tripDistanceNm.toFixed(1)} NM，耗时 ${fuel.totals.tripMinutes.toFixed(1)} min，耗油 ${fuel.totals.tripKg.toFixed(1)} kg。</p><p>预计目的地着陆 ${fuel.planned.destinationLandingMassKg.toFixed(1)} kg；备降着陆 ${fuel.planned.alternateLandingMassKg.toFixed(1)} kg。</p><p>起飞重心 ${planning.loadingAccepted?planning.loading!.points!.takeoff.cgPercentMac.toFixed(2)+' %MAC（工程配载）':'尚未确认工程配载'}。分段距离、油耗和重心几何为工程输入及假设。</p></div>`;
 }
 data.departingMetar=metarFor(f.from,f);data.arrivingMetar=metarFor(f.to,f);
 store.dispatch(setSimbriefData(data));store.dispatch(setFuelImported(false));store.dispatch(setPayloadImported(false));
 const host=(window as any).__LOCAL_EFB__;if(host){for(const [k,v] of Object.entries({'EMPTY WEIGHT':f.oewKg,'L:A32NX_AIRFRAME_ZFW_DESIRED':w.zfw,'L:A32NX_AIRFRAME_GW_DESIRED':w.ramp,'L:A32NX_WB_PER_PAX_WEIGHT':f.paxKg,'L:A32NX_WB_PER_BAG_WEIGHT':f.bagKg,'L:A32NX_FUEL_DESIRED':f.rampKg})){host.set(k,v);}}runtime.setPlan(f);
}
export function download(name:string,value:any){const blob=new Blob([typeof value==='string'?value:JSON.stringify(value,null,2)],{type:typeof value==='string'?'text/html;charset=utf-8':'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name.replace(/[^a-zA-Z0-9_.-]/g,'_');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function reportHtml(){const r=currentResult();if(!r)throw Error('结果无效、过期或超出支持范围，不能导出当前报告');return `<!doctype html><meta charset="utf-8"><title>A339 本地参考核算单</title><style>body{font-family:Arial,'Microsoft YaHei';max-width:900px;margin:40px auto;color:#172b44;line-height:1.6}h1{font-size:26px}.notice{border:2px solid #d58b24;padding:16px}pre{white-space:pre-wrap;word-break:break-all;font-size:12px}@media print{button{display:none}}</style><button onclick="window.print()">打印 / 保存为 PDF</button><h1>A339 本地起飞参考核算单</h1><p class="notice">仅为未校准源码速度表参考。未提供 V1、VR、FLEX、起飞距离、加速停止距离、障碍物净空及单发爬升判定；不得据此判断允许起飞。</p><p>航班 ${esc(r.input.number)} · ${esc(r.input.date)} · ${esc(r.input.from)} / ${esc(r.input.runway.ident)}</p><p>TOW ${r.weights!.tow.toFixed(1)} kg；V2 参考 ${r.v2!.toFixed(2)} kt（上取整 ${Math.ceil(r.v2!)} kt）；压力高度 ${r.pressureAltitudeFt!.toFixed(1)} ft</p><p>迎风 ${r.headwindKt!.toFixed(1)} kt；侧风 ${r.crosswindKt!.toFixed(1)} kt；扣减后 TORA ${r.effectiveTora} m（无性能可用性判定）</p><p>数据包 ${esc(r.profileVersion)} / 内核 ${esc(r.engineVersion)}；生成 ${esc(r.at)}</p><p>来源：${esc(profile.sourceUrl)}</p><h2>输入快照与覆盖范围</h2><pre>${esc(JSON.stringify(r,null,2))}</pre>`;}
export function printReport(){const html=reportHtml();const w=window.open('','_blank');if(!w)throw Error('浏览器阻止弹窗，请使用 HTML 导出');w.document.write(html);w.document.close();}
export function initializeLocal(){initializeRuntime();if(state.confirmed===signature(state.flight)&&!state.storageConflict)applyToEfb(state.flight);(window as any).__LOCAL_FLIGHT__={getState,editFlight,confirmFlight,runCalculation,currentResult};window.addEventListener('local-ground-change',markGroundChanged);window.addEventListener('local-runtime-error',(e:any)=>notice(e.detail));window.addEventListener('storage',e=>{if(e.key===KEY&&e.newValue!==lastStored)conflict();});}
