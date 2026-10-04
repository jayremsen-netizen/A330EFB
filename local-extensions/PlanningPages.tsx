import React,{useMemo,useEffect} from 'react';
import {Link} from 'react-router-dom';
import {useLocal,editFlight,confirmFlight,notice,download} from './state';
import {signature} from './flight';
import {initializePlanning,changePlanning,derivePlanning,acceptLoading,planningBundle} from './planning-context';
import {planningReportHtml} from './planning-report';
import {FuelPlanning} from './FuelPlanning';
import {LoadingBalance} from './LoadingBalance';
import {EngineeringLanding} from './EngineeringLanding';
import './planning.css';

type View='overview'|'fuel'|'loading'|'landing';
const routes=[['/dispatch/engineering-plan','综合计划'],['/dispatch/fuel-plan','航路燃油'],['/ground/loading-balance','配载重心'],['/performance/engineering-landing','工程着陆']] as const;
const n=(value:number|null|undefined,digits=0)=>value===null||value===undefined||!Number.isFinite(value)?'—':value.toLocaleString('en-US',{maximumFractionDigits:digits});
export function PlanningPage({view='overview'}:{view?:View}){
 const s=useLocal(),f=s.flight,p=useMemo(()=>derivePlanning(f),[f]);
 const confirmed=s.confirmed===signature(f)&&!s.groundChanged&&!s.storageConflict;
 const run=(fn:()=>void)=>{try{fn();}catch(e){notice(e instanceof Error?e.message:String(e));}};
 const bundle=()=>planningBundle(f,confirmed);
 const ready=confirmed&&p.landingMass.valid&&!!f.planning?.landing;
 const api=()=>({ready,confirmed,fuelStatus:p.fuel?.status||'not-planned',loadingAccepted:p.loadingAccepted,landingKg:p.landingMass.landingKg,fuel:p.fuel,loading:p.loading,report:ready?()=>planningReportHtml(bundle()):null});
 useEffect(()=>{const current={snapshot:api,artifacts:()=>{if(!ready)return {result:null,report:null};const b=bundle();return {result:JSON.stringify(b,null,2),report:planningReportHtml(b)};}};(window as any).__LOCAL_PLANNING__=current;return()=>{if((window as any).__LOCAL_PLANNING__===current)delete (window as any).__LOCAL_PLANNING__;};},[f,confirmed]);
 const update=<K extends 'fuel'|'loading'|'landing'>(key:K,value:any)=>editFlight(changePlanning(f,key,value));
 const overview=<>
  <div className="lf-planning-cards"><section><h3>01 航路燃油</h3><strong>{n(p.fuel?.requiredRampKg)} <small>kg 建议停机坪燃油</small></strong><p>{p.fuel?.label||'尚未建立分段计划'}</p><Link to={routes[1][0]}>录入航段与储备 →</Link></section><section><h3>02 配载重心</h3><strong>{n(p.loading?.points?.takeoff.cgPercentMac,2)} <small>%MAC 起飞</small></strong><p>{p.loadingAccepted?'当前配载已确认':'需核对分区及确认配载'}</p><Link to={routes[2][0]}>查看载荷站位与包线 →</Link></section><section><h3>03 工程着陆</h3><strong>{n(p.landingMass.landingKg)} <small>kg 预计着陆重量</small></strong><p>{p.landingMass.valid?'重量来自当前航路燃油与已确认配载':'等待有效燃油与配载计划'}</p><Link to={routes[3][0]}>录入目的地或备降条件 →</Link></section></div>
  <section><h3>一份航班计划贯穿计算</h3><p>先核对燃油分项，按需采用建议停机坪燃油；再调整客舱和货舱分配，确认目的地及备降重心；保存确认航班后进入工程着陆。采用计划只改变地面目标，实际加油和装载仍须通过地面操作完成。</p><p>机场、航路、载荷或油量变化后，受影响的结果和确认立即失效。原始输入保留，便于核对。</p><div className="lf-toolbar"><button disabled={!ready} onClick={()=>run(()=>download('a330efb-engineering-plan.json',bundle()))}>导出综合结果 JSON</button><button disabled={!ready} onClick={()=>run(()=>download('a330efb-engineering-plan.html',planningReportHtml(bundle())))}>导出综合工程报告</button></div><p className="lf-muted">报告按当前输入重新求解并记录约束状态；不可行结果以诊断形式保留，不视为可采用性能。</p></section>
  {p.landingMass.errors.length>0&&<div className="lf-warning">{p.landingMass.errors.join('；')}</div>}
 </>;
 return <div className="lf-root lf-planning-root" data-testid="planning-workspace"><div className="lf-heading"><div><h2>{({overview:'综合工程计划',fuel:'航路及备降燃油',loading:'配载与重心',landing:'工程着陆性能'})[view]} <span className="lf-subtitle">{f.number} · {f.from} → {f.to}</span></h2><p>A330-941 投标演示 · 工程参数与数据来源随结果保存</p></div><Link to="/dispatch/local-flight">编辑航班</Link></div><nav className="lf-toolbar lf-planning-nav">{routes.map(([href,label])=><Link key={href} to={href}>{label}</Link>)}</nav><div className="lf-message" role="status">{s.storageError||s.notice}</div><div className="lf-toolbar"><button disabled={s.storageConflict} onClick={()=>confirmFlight()}>保存并确认重量</button><span data-testid="planning-confirmation">{confirmed?'当前航班已确认':'当前航班待确认'} · {p.loadingAccepted?'配载已确认':'配载待确认'}</span></div>
 {!f.planning?.fuel||!f.planning?.loading||!f.planning?.landing?<section><h3>建立本航班的工程输入</h3><p>创建手工演示航段、按当前总量分配的客舱与货舱，以及独立的目的地着陆条件。默认数字是工程样例，需逐项核对。</p><button className="primary" disabled={s.storageConflict} onClick={()=>run(()=>editFlight(initializePlanning(f)))}>建立三项工程计划</button></section>:<>
 {view==='overview'&&overview}
 {view==='fuel'&&<FuelPlanning flight={f} input={f.planning.fuel} onChange={value=>update('fuel',value)} disabled={s.storageConflict} onApplyFuel={kg=>run(()=>{const current=derivePlanning(f).fuel;if(!current?.canApply||current.requiredRampKg!==kg)throw Error('燃油结果已变化或不满足采用条件，请重新计算');editFlight({...f,rampKg:kg,planning:{...f.planning!,loadingAccepted:undefined}});})}/>}
 {view==='loading'&&<><LoadingBalance accepted={p.loadingAccepted} flight={f} input={f.planning.loading} onChange={value=>update('loading',value)} landingFuelKg={p.fuel?.status==='engineering-feasible'?p.fuel.planned?.destinationLandingFuelKg:undefined} onAdopt={()=>run(()=>editFlight(acceptLoading(f)))} adoptionBlockedReason={s.storageConflict?'请先处理其他窗口的保存冲突':!p.loadingReady?'当前燃油或目的地／备降配载约束未满足':undefined}/><p className="lf-message" data-testid="alternate-cg">备降着陆：{n(p.alternateLoading?.points?.landing?.massKg)} kg / {n(p.alternateLoading?.points?.landing?.cgPercentMac,2)} %MAC。目的地与备降均通过后才可确认配载。</p></>}
 {view==='landing'&&<><p className="lf-message">{p.landingMass.source}。{!confirmed?'请先保存确认当前航班。':''}</p><EngineeringLanding flight={f} input={f.planning.landing} onChange={value=>update('landing',value)} mass={p.landingMass} workflowSignature={p.workflowSignature} disabled={!confirmed}/></>}
 </>}
 </div>;
}
