import React,{useEffect,useState} from 'react';
import {runtime} from './runtime-host';
import {Command,CommandKind} from './demo-runtime';
import {Flight,signature} from './flight';
import {commandUsesOldPlan,groundPreparation} from './ground-plan';
import {useLocal,restorePreparedGround,acknowledgeGroundReset} from './state';
import './local.css';

const labels:Record<string,string>={'gpu-connect':'连接外接电源','gpu-disconnect':'断开外接电源',refuel:'按计划加油',board:'按计划登机',deboard:'下客并卸载',pushback:'请求推出'};
const status:Record<string,string>={accepted:'已受理',running:'执行中',completed:'完成',rejected:'拒绝',failed:'中止'};
export function useRuntime(){const [s,set]=useState(runtime.snapshot());useEffect(()=>runtime.subscribe(()=>set(runtime.snapshot())),[]);return s;}
const amount=(v:number)=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:1}):'—';
export function GroundPreparation(){
 const local=useLocal(),s=useRuntime(),p=groundPreparation(local.flight,s,!local.storageConflict&&!local.groundChanged&&local.confirmed===signature(local.flight));
 return <div className={p.ready?'lf-message':'lf-warning'} data-testid="ground-preparation" role="status"><b>计划{p.planConfirmed?'已确认':'待确认'} · {p.ready?'实际地面准备满足当前计划':'实际地面准备尚未满足当前计划'}</b><p>差额（实际 − 当前计划）：燃油 {amount(p.fuelDifferenceKg)} kg / 旅客 {amount(p.paxDifference)} 人 / 货物 {amount(p.cargoDifferenceKg)} kg。</p>{p.issues.length>0&&<p>{p.issues.join('；')}。推出为演示动作，不表示计划通过放行。</p>}</div>;
}
export function CommandReceipt({command:c,flight:f}:{command:Command;flight:Flight}){
 const old=commandUsesOldPlan(c,f);
 return <><b>{labels[c.kind]} · {status[c.status]}{old?' · 按旧计划执行':''}</b><span>　{c.message}</span>{c.plan&&<small>提交航班 {c.plan.flightNumber} · {c.plan.flightId} · 计划版本 {c.plan.version}{c.plan.fuelTargetKg!==undefined?` · 目标燃油 ${amount(c.plan.fuelTargetKg)} kg`:''}{c.plan.paxTarget!==undefined?` · 目标 ${c.plan.paxTarget} 人 / 货物 ${amount(c.plan.cargoTargetKg!)} kg`:''}</small>}{old&&<p className="lf-error">相关目标已变更；本请求保持提交时目标。请停止操作或完成后按当前计划重新请求。</p>}{!!c.plan?.warnings?.length&&<p className="lf-error">推出请求时尚有准备差异：{c.plan.warnings.join('；')}。</p>}</>;
}
function Header({title}:{title:string}){return <div className="lf-heading"><div><h2>{title}</h2><p>本地演示模型 · 每个请求具有独立回执</p></div><span className="lf-chip">本地仿真 未连接飞机</span></div>;}
function StateCards(){const s=useRuntime();return <div className="lf-metrics"><div>外接电源<strong>{s.gpuConnected?'已连接':'已断开'}</strong></div><div>当前油量<strong>{s.fuelKg.toFixed(0)} kg</strong></div><div>当前人数<strong>{s.pax}</strong></div><div>推出距离<strong>{s.pushbackMetres.toFixed(1)} m</strong></div></div>;}
export function LocalSimulationPage({pushback=false}:{pushback?:boolean}){
 const s=useRuntime(),flight=useLocal().flight,[message,setMessage]=useState('选择操作后观察进度与回执。');
 useEffect(()=>{const c=s.commands[0];if(c)setMessage(`${labels[c.kind]}：${c.message}`);},[s.revision]);
 const send=(kind:CommandKind)=>{try{const r=runtime.command(kind);setMessage(`${labels[kind]}：${r.message}`);}catch(e){setMessage((e as Error).message);}};
 return <div className="lf-root" data-testid="local-simulation"><Header title={pushback?'本地推出演示':'地面服务'}/><StateCards/>
 <div className="lf-message" role="status">{message}</div><GroundPreparation/><div className="simulation-grid">
 <section><h3>地面请求</h3><div className="lf-toolbar">{(['gpu-connect','gpu-disconnect','refuel','board','deboard','pushback'] as CommandKind[]).map(k=><button key={k} onClick={()=>send(k)}>{labels[k]}</button>)}<button onClick={()=>runtime.cancel()}>停止当前操作</button></div><p>计划：{flight.number} · 燃油 {flight.rampKg} kg · 人数 {flight.pax}。加油与登机使用已确认的计划；下客将当前人数与货物归零，计划保持不变。演示进度约 3 秒。</p><p>推出前须完成其他操作并断开外接电源；推出距离为示意量，不改变地图或飞机位置。</p></section>
 <section><h3>设备状态</h3><p className={s.faults.length?'sim-fault':'sim-state'}>{s.faults.length?s.faults.map(f=>f==='gpu'?'外接电源故障':'加油设备故障').join('；'):'无活动故障'}</p><p>会话 {s.session} · 状态版本 {s.revision}</p><p>故障注入与解除在“故障”页面操作；预设页面可恢复停机位或准备完成状态。</p></section></div>
 <section style={{marginTop:14}}><h3>命令回执</h3>{s.commands.length?s.commands.slice(0,12).map(c=><div className="sim-command" key={c.id} data-testid="command-receipt"><CommandReceipt command={c} flight={flight}/><progress max={1} value={c.progress}/><small>{c.id} · {Math.round(c.progress*100)}%</small></div>):<p>本会话尚无请求。</p>}</section></div>;
}
export function LocalFaultPage(){const s=useRuntime();return <div className="lf-root" data-testid="local-faults"><Header title="设备故障演示"/><StateCards/><div className="simulation-grid">{(['gpu','refuel'] as const).map(f=><section key={f}><h3>{f==='gpu'?'外接电源':'加油设备'}</h3><p className={s.faults.includes(f)?'sim-fault':'sim-state'}>{s.faults.includes(f)?'故障激活':'设备正常'}</p><p>{f==='gpu'?'激活后断开电源，阻止新的连接请求。':'激活后中止正在执行的加油，并保留已加油量。'}</p><button onClick={()=>runtime.fault(f,!s.faults.includes(f))}>{s.faults.includes(f)?'解除':'激活'}{f==='gpu'?'电源':'加油'}故障</button></section>)}</div><p>这里提供两类用于讲解交互的设备故障。故障不会向真实飞机、模拟器或其他浏览器窗口发送命令。</p></div>;}
export function LocalPresetPage(){const s=useRuntime(),local=useLocal(),[message,setMessage]=useState('预设将中止当前地面请求并建立新会话，航班计划保持可编辑。');const apply=(name:'parked'|'prepared')=>{try{if(name==='prepared')restorePreparedGround();else{runtime.preset(name);acknowledgeGroundReset();}setMessage('预设已生效，新会话 '+runtime.snapshot().session);}catch(e){setMessage((e as Error).message);}};return <div className="lf-root" data-testid="local-presets"><Header title="场景预设"/><StateCards/>{local.groundReset&&<div className="lf-warning" data-testid="ground-reset-notice"><b>刷新已重建停机场景</b><p>航班与计划保留，实际燃油复位为 5000 kg、0 人、0 货物，GPU 断开；进行中的操作、故障和旧回执已清除。确认计划后可恢复准备预设。</p></div>}<div className="lf-message">{message}</div><div className="simulation-grid"><section><h3>停机待服务</h3><p>断开电源、5000 kg 燃油、0 名旅客、0 货物，推出距离归零，解除全部演示故障。</p><button onClick={()=>apply('parked')}>恢复停机预设</button></section><section><h3>准备完成</h3><p>连接电源，燃油、人数及货物采用已确认计划。随后可断开电源并演示推出。</p><button disabled={local.storageConflict||local.groundChanged||local.confirmed!==signature(local.flight)} onClick={()=>apply('prepared')}>恢复准备预设</button></section></div><p>当前会话 {s.session}。场景时间使用航班日期，固定 0800Z；灯光、发动机和完整飞机状态预设不在本地模型范围内。</p></div>;}
