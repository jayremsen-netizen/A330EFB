import React,{useEffect,useState} from 'react';
import {runtime} from './runtime-host';
import {CommandKind} from './demo-runtime';
import {useLocal} from './state';
import './local.css';

const labels:Record<string,string>={'gpu-connect':'连接外接电源','gpu-disconnect':'断开外接电源',refuel:'按计划加油',board:'按计划登机',deboard:'下客并卸载',pushback:'请求推出'};
const status:Record<string,string>={accepted:'已受理',running:'执行中',completed:'完成',rejected:'拒绝',failed:'中止'};
export function useRuntime(){const [s,set]=useState(runtime.snapshot());useEffect(()=>runtime.subscribe(()=>set(runtime.snapshot())),[]);return s;}
function Header({title}:{title:string}){return <div className="lf-heading"><div><h2>{title}</h2><p>本地演示模型 · 每个请求具有独立回执</p></div><span className="lf-chip">本地仿真 未连接飞机</span></div>;}
function StateCards(){const s=useRuntime();return <div className="lf-metrics"><div>外接电源<strong>{s.gpuConnected?'已连接':'已断开'}</strong></div><div>当前油量<strong>{s.fuelKg.toFixed(0)} kg</strong></div><div>当前人数<strong>{s.pax}</strong></div><div>推出距离<strong>{s.pushbackMetres.toFixed(1)} m</strong></div></div>;}
export function LocalSimulationPage({pushback=false}:{pushback?:boolean}){
 const s=useRuntime(),flight=useLocal().flight,[message,setMessage]=useState('选择操作后观察进度与回执。');
 useEffect(()=>{const c=s.commands[0];if(c)setMessage(`${labels[c.kind]}：${c.message}`);},[s.revision]);
 const send=(kind:CommandKind)=>{try{const r=runtime.command(kind);setMessage(`${labels[kind]}：${r.message}`);}catch(e){setMessage((e as Error).message);}};
 return <div className="lf-root" data-testid="local-simulation"><Header title={pushback?'本地推出演示':'地面服务'}/><StateCards/>
 <div className="lf-message" role="status">{message}</div><div className="simulation-grid">
 <section><h3>地面请求</h3><div className="lf-toolbar">{(['gpu-connect','gpu-disconnect','refuel','board','deboard','pushback'] as CommandKind[]).map(k=><button key={k} onClick={()=>send(k)}>{labels[k]}</button>)}<button onClick={()=>runtime.cancel()}>停止当前操作</button></div><p>计划：{flight.number} · 燃油 {flight.rampKg} kg · 人数 {flight.pax}。加油与登机使用已确认的计划；下客将当前人数与货物归零，计划保持不变。演示进度约 3 秒。</p><p>推出前须完成其他操作并断开外接电源；推出距离为示意量，不改变地图或飞机位置。</p></section>
 <section><h3>设备状态</h3><p className={s.faults.length?'sim-fault':'sim-state'}>{s.faults.length?s.faults.map(f=>f==='gpu'?'外接电源故障':'加油设备故障').join('；'):'无活动故障'}</p><p>会话 {s.session} · 状态版本 {s.revision}</p><p>故障注入与解除在“故障”页面操作；预设页面可恢复停机位或准备完成状态。</p></section></div>
 <section style={{marginTop:14}}><h3>命令回执</h3>{s.commands.length?s.commands.slice(0,12).map(c=><div className="sim-command" key={c.id}><b>{labels[c.kind]} · {status[c.status]}</b><span>　{c.message}</span><progress max={1} value={c.progress}/><small>{c.id} · {Math.round(c.progress*100)}%</small></div>):<p>本会话尚无请求。</p>}</section></div>;
}
export function LocalFaultPage(){const s=useRuntime();return <div className="lf-root" data-testid="local-faults"><Header title="设备故障演示"/><StateCards/><div className="simulation-grid">{(['gpu','refuel'] as const).map(f=><section key={f}><h3>{f==='gpu'?'外接电源':'加油设备'}</h3><p className={s.faults.includes(f)?'sim-fault':'sim-state'}>{s.faults.includes(f)?'故障激活':'设备正常'}</p><p>{f==='gpu'?'激活后断开电源，阻止新的连接请求。':'激活后中止正在执行的加油，并保留已加油量。'}</p><button onClick={()=>runtime.fault(f,!s.faults.includes(f))}>{s.faults.includes(f)?'解除':'激活'}{f==='gpu'?'电源':'加油'}故障</button></section>)}</div><p>这里提供两类用于讲解交互的设备故障。故障不会向真实飞机、模拟器或其他浏览器窗口发送命令。</p></div>;}
export function LocalPresetPage(){const s=useRuntime(),[message,setMessage]=useState('预设将中止当前地面请求并建立新会话，航班计划保持可编辑。');const apply=(name:'parked'|'prepared')=>{try{runtime.preset(name);setMessage('预设已生效，新会话 '+runtime.snapshot().session);}catch(e){setMessage((e as Error).message);}};return <div className="lf-root" data-testid="local-presets"><Header title="场景预设"/><StateCards/><div className="lf-message">{message}</div><div className="simulation-grid"><section><h3>停机待服务</h3><p>断开电源、5000 kg 燃油、0 名旅客、推出距离归零，解除全部演示故障。</p><button onClick={()=>apply('parked')}>恢复停机预设</button></section><section><h3>准备完成</h3><p>连接电源，燃油和人数采用已确认计划。随后可断开电源并演示推出。</p><button onClick={()=>apply('prepared')}>恢复准备预设</button></section></div><p>当前会话 {s.session}。灯光、发动机和完整飞机状态预设不在本地模型范围内。</p></div>;}
