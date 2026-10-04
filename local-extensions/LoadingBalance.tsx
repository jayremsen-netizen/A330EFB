import React,{useState} from 'react';
import {calculateLoading,defaultLoading,modelParameters as P} from './loading';
import type {LoadingFlight,LoadingInput,LoadingPoint,LoadingResult} from './loading';

export interface LoadingBalanceProps {
 flight:LoadingFlight;input:LoadingInput;onChange:(input:LoadingInput)=>void;landingFuelKg?:number;
 onAdopt?:(result:LoadingResult)=>void;adoptionBlockedReason?:string;accepted?:boolean;
}
const number=(value:number|null|undefined,places=0)=>typeof value==='number'&&Number.isFinite(value)?value.toLocaleString('en-US',{maximumFractionDigits:places,minimumFractionDigits:places}):'—';
const labels={zfw:'零燃油 ZFW',ramp:'停机坪 RAMP',takeoff:'起飞 TOW',landing:'着陆 LW'};
const colors={zfw:'#93c5fd',ramp:'#f9cf6c',takeoff:'#70dac5',landing:'#d6a6ff'};

function Envelope({result}:{result:LoadingResult}) {
 const points=result.points?Object.values(result.points).filter((p):p is LoadingPoint=>Boolean(p)):[];
 const cgMin=Math.min(10,...points.map(p=>Math.floor(p.cgPercentMac/5)*5)),cgMax=Math.max(45,...points.map(p=>Math.ceil(p.cgPercentMac/5)*5));
 const massMin=100000,massMax=Math.max(275000,...points.map(p=>Math.ceil(p.massKg/25000)*25000));
 const x=(cg:number)=>62+(cg-cgMin)/(cgMax-cgMin)*500,y=(mass:number)=>300-(mass-massMin)/(massMax-massMin)*250;
 const polygon=[...P.envelope.map(p=>`${x(p.forward)},${y(p.massKg)}`),...P.envelope.slice().reverse().map(p=>`${x(p.aft)},${y(p.massKg)}`)].join(' ');
 return <figure className="engineering-chart" data-testid="loading-envelope">
  <svg viewBox="0 0 620 355" role="img" aria-label="质量与重心工程包线，显示零燃油、停机坪、起飞及着陆点" style={{width:'100%',height:'auto'}}>
   <title>按当前配载力矩计算的质量—重心图；阴影为工程假设包线</title>
   <g fill="currentColor" fontSize="12">
    {Array.from({length:8},(_,i)=>{const mass=100000+i*(massMax-100000)/7;return <g key={i}><line x1="62" x2="562" y1={y(mass)} y2={y(mass)} stroke="#536071" opacity=".35"/><text x="54" y={y(mass)+4} textAnchor="end">{number(mass/1000,0)}</text></g>;})}
    {Array.from({length:8},(_,i)=>{const cg=cgMin+i*(cgMax-cgMin)/7;return <g key={i}><line x1={x(cg)} x2={x(cg)} y1="50" y2="300" stroke="#536071" opacity=".25"/><text x={x(cg)} y="321" textAnchor="middle">{number(cg,1)}</text></g>;})}
    <polygon points={polygon} fill="#5799b3" fillOpacity=".2" stroke="#83bed0" strokeWidth="2"/>
    <line x1="62" x2="562" y1={y(P.massLimitsKg.zfw)} y2={y(P.massLimitsKg.zfw)} stroke={colors.zfw} strokeDasharray="5 5" opacity=".65"/>
    <line x1="62" x2="562" y1={y(P.massLimitsKg.landing)} y2={y(P.massLimitsKg.landing)} stroke={colors.landing} strokeDasharray="5 5" opacity=".65"/>
    <text x="62" y="25">质量 (t)</text><text x="562" y="346" textAnchor="end">纵向重心 (% MAC)</text>
    {points.map(p=><g key={p.phase}><circle cx={x(p.cgPercentMac)} cy={y(p.massKg)} r="6" fill={colors[p.phase]} stroke={p.withinCg&&p.withinMass?'#122536':'#ff6d62'} strokeWidth="2"><title>{labels[p.phase]}：{number(p.massKg)} kg / {number(p.cgPercentMac,2)} % MAC</title></circle><text x={x(p.cgPercentMac)+(p.phase==='landing'?-9:9)} textAnchor={p.phase==='landing'?'end':'start'} y={y(p.massKg)+(p.phase==='takeoff'?18:p.phase==='ramp'?-10:4)} fill={colors[p.phase]}>{p.phase==='takeoff'?'TOW':p.phase.toUpperCase()}</text></g>)}
   </g>
  </svg>
  <figcaption className="lf-muted">阴影为模型假设包线；虚线为 MZFW 181 t 与着陆模型上限 191 t。边界不是 A330 获批限制。{!points.length&&'分配无效，当前不绘制计算点。'}</figcaption>
 </figure>;
}

function StationDiagram({input}:{input:LoadingInput}) {
 return <figure className="engineering-chart" data-testid="loading-stations">
  <svg viewBox="0 0 720 190" role="img" aria-label="工程纵向站位分布，机鼻在左，前后客舱与货舱力臂" style={{width:'100%',height:'auto'}}>
   <title>工程站位示意，位置用于力矩计算，不是实际 A330 客舱布局</title>
   <path d="M24 78 Q50 36 100 36 L612 36 Q659 48 691 78 Q659 108 612 120 L100 120 Q50 120 24 78Z" fill="#202f41" stroke="#738597"/>
   <g fill="currentColor" fontSize="12" textAnchor="middle">
    <text x="42" y="26">机鼻 / 0 m</text>
    {P.cabin.map((station,i)=><g key={station.id} transform={`translate(${24+station.armM/62.84*667},0)`}><rect x="-35" y="47" width="70" height="43" rx="4" fill="#253f58" stroke="#6092b4"/><text y="64">{station.id} · {number(input.cabinPax?.[i])} 人</text><text y="81" fill="#bccedd">{station.armM} m</text></g>)}
    {P.holds.map((station,i)=><g key={station.id} transform={`translate(${24+station.armM/62.84*667},0)`}><line x1="0" x2="0" y1="100" y2="129" stroke="#92a17c"/><rect x="-31" y="129" width="62" height="38" rx="3" fill="#39442d" stroke="#a0b389"/><text y="144" fontSize="10">{station.id} {station.armM} m</text><text y="160" fontSize="10">{number((input.holdBaggageKg?.[i]??NaN)+(input.holdFreightKg?.[i]??NaN))} kg</text></g>)}
   </g>
  </svg>
  <figcaption className="lf-muted">全部站位为演示假设，力臂从工程机鼻原点向后计量。行李和货物共用同一货舱容量。</figcaption>
 </figure>;
}

export function LoadingBalance({flight,input,onChange,landingFuelKg,onAdopt,adoptionBlockedReason,accepted=false}:LoadingBalanceProps) {
 const [message,setMessage]=useState('');
 const result=calculateLoading(flight,input,landingFuelKg);
 const change=(key:keyof LoadingInput,index:number,value:string)=>{const next={...input,[key]:[...input[key]]};next[key][index]=value===''?NaN:Number(value);setMessage('');onChange(next);};
 const allocate=()=>{try{onChange(defaultLoading(flight));setMessage('已按计划总量分配到工程站位；请核对各舱位后确认。');}catch(error){setMessage((error as Error).message);}};
 const exportResult=()=>{if(!result.points)return;const blob=new Blob([JSON.stringify(result,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='a330efb-engineering-loading.json';a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const canAdopt=result.canAdopt&&!adoptionBlockedReason&&Boolean(onAdopt);
 return <div className="engineering-loading" data-testid="loading-balance">
  <div className="lf-warning"><b>配载与重心工程模型 · 仅用于投标演示</b><p>通过分舱分配计算质量、力矩和 % MAC。客舱布局、纵向力臂、MAC 几何与重心包线均为工程假设，不用于实际装载或签派。</p></div>
  <div className="lf-toolbar"><button onClick={allocate}>按计划自动分配</button><button className="primary" disabled={!canAdopt} onClick={()=>{if(canAdopt)onAdopt?.(result);}}>确认配载方案</button><button disabled={!result.points} onClick={exportResult}>导出配载 JSON</button><span className="lf-muted">{accepted?'当前配载已确认':'修改后需要重新确认'}</span></div>
  {message&&<p className="lf-message" role="status">{message}</p>}
  {adoptionBlockedReason&&<p className="lf-message">{adoptionBlockedReason}</p>}
  <div className="lf-metrics"><div>计划旅客<strong>{number(flight.pax)} <small>人</small></strong></div><div>计划行李<strong>{number(flight.pax*flight.bagKg)} <small>kg</small></strong></div><div>计划货物<strong>{number(flight.freightKg)} <small>kg</small></strong></div><div>着陆剩余燃油<strong>{number(landingFuelKg)} <small>kg</small></strong></div></div>
  <StationDiagram input={input}/>
  <div className="lf-cols">
   <section><h3>客舱分配</h3><p className="lf-muted">单人重量 {number(flight.paxKg)} kg；行李在下方货舱单独分配。</p><div className="lf-grid">
    {P.cabin.map((station,i)=><label key={station.id} className="lf-field"><span>{station.label} · 上限 {station.capacity} 人</span><input type="number" aria-label={`${station.label}旅客人数`} data-field={`loading.cabinPax.${i}`} min="0" max={station.capacity} step="1" value={Number.isFinite(input.cabinPax[i])?input.cabinPax[i]:''} onChange={event=>change('cabinPax',i,event.target.value)}/></label>)}
   </div><p>已分配 {number(result.totals?.pax??(input.cabinPax.every(Number.isFinite)?input.cabinPax.reduce((a,b)=>a+b,0):NaN))} / {number(flight.pax)} 人</p></section>
   <section><h3>货舱分配</h3>{P.holds.map((station,i)=><div key={station.id} style={{marginBottom:12}}><p>{station.label} · 合计上限 {number(station.capacityKg)} kg</p><div className="lf-grid"><label className="lf-field"><span>行李 (kg)</span><input type="number" aria-label={`${station.label}行李 kg`} data-field={`loading.holdBaggageKg.${i}`} min="0" step="0.01" value={Number.isFinite(input.holdBaggageKg[i])?input.holdBaggageKg[i]:''} onChange={event=>change('holdBaggageKg',i,event.target.value)}/></label><label className="lf-field"><span>货物 (kg)</span><input type="number" aria-label={`${station.label}货物 kg`} data-field={`loading.holdFreightKg.${i}`} min="0" step="0.01" value={Number.isFinite(input.holdFreightKg[i])?input.holdFreightKg[i]:''} onChange={event=>change('holdFreightKg',i,event.target.value)}/></label></div></div>)}</section>
  </div>
  <div data-testid="loading-result" data-status={result.status} data-valid={result.canAdopt} className={result.canAdopt?'lf-result':'lf-result stale'}>
   <h3>{result.status==='invalid'?'输入或合计不符 · 未生成重心解':result.canAdopt?'工程质量与重心约束满足':'超出演示工程约束 · 禁止采用'}</h3>
   {result.errors.length>0&&<ul role="alert">{result.errors.map(error=><li key={error}>{error}</li>)}</ul>}
   {result.warnings.map(warning=><p key={warning}>{warning}</p>)}
   {result.points&&<div className="lf-metrics">{Object.values(result.points).filter((point):point is LoadingPoint=>Boolean(point)).map(point=><div key={point.phase} data-testid={`loading-${point.phase}`} style={{borderColor:colors[point.phase]}}>{labels[point.phase]}<strong>{number(point.cgPercentMac,2)} <small>% MAC</small></strong><span>{number(point.massKg)} kg</span><br/><small>{point.withinCg&&point.withinMass?'模型约束满足':'模型约束超限'}</small></div>)}</div>}
  </div>
  <Envelope result={result}/>
  <details className="engineering-assumptions"><summary>质量与力矩明细</summary><p className="lf-formula">力矩 Σ(m × arm)；CG = Σ(m × arm) / Σm；% MAC = (CG − 29) / 7 × 100</p>{result.points&&<table style={{width:'100%',textAlign:'right',fontSize:13}}><thead><tr><th style={{textAlign:'left'}}>站位</th><th>质量 kg</th><th>力臂 m</th><th>力矩 kg·m</th></tr></thead><tbody><tr><td style={{textAlign:'left'}}>OEW</td><td>{number(flight.oewKg)}</td><td>{number(P.geometry.oewArmM,2)}</td><td>{number(flight.oewKg*P.geometry.oewArmM)}</td></tr>{result.stations.map(station=><tr key={station.id}><td style={{textAlign:'left'}}>{station.label}</td><td>{number(station.massKg,2)}</td><td>{number(station.armM,2)}</td><td>{number(station.momentKgM,2)}</td></tr>)}</tbody></table>}</details>
  <details className="engineering-assumptions"><summary>模型假设、适用范围与参数来源 · {P.version}</summary><ul>{P.assumptions.map(text=><li key={text}>{text}</li>)}</ul><p><a href={P.provenance.formulaUrl} target="_blank" rel="noreferrer">FAA 重量平衡原理</a> · <a href={P.provenance.massConfigurationUrl} target="_blank" rel="noreferrer">Headwind 固定提交质量配置</a></p><pre>{JSON.stringify(P,null,2)}</pre></details>
 </div>;
}
