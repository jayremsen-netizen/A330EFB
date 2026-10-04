import React,{useEffect,useState} from 'react';
import {calculateLanding,defaultLandingInput,landingSignature,landingParameters,landingChartSvg,landingReportHtml} from './landing';
import type {LandingContext,LandingFlight,LandingInput,LandingResult} from './landing';

export interface EngineeringLandingProps {
 flight:LandingFlight;input:LandingInput;onChange:(next:LandingInput)=>void;
 mass:{landingKg:number|null;source:string;signature:string;valid:boolean;errors?:string[]};
 workflowSignature:string;disabled?:boolean;blockReason?:string;
}
const n=(value:number|null|undefined,decimals=0)=>typeof value==='number'&&Number.isFinite(value)?value.toLocaleString('en-US',{maximumFractionDigits:decimals,minimumFractionDigits:decimals}):'—';
const statusLabel={'engineering-feasible':'工程约束满足 · 仅在本模型内成立','engineering-infeasible':'工程距离不足 · 结果仅用于诊断','invalid':'输入无效 · 未生成工程解','unsupported':'超出工程模型支持范围'};
function saveFile(filename:string,content:string,type:string){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

/** All flight, mass and form state belongs to the workflow owner. This component stores only one calculation snapshot. */
export function EngineeringLanding({flight,input,onChange,mass,workflowSignature,disabled=false,blockReason}:EngineeringLandingProps){
 const [entry,setEntry]=useState<{key:string;result:LandingResult}|null>(null);
 const context:LandingContext={flight,massSource:mass.source,massSignature:mass.signature,workflowSignature};
 const key=landingSignature(input,mass.landingKg??NaN,context);
 const permitted=mass.valid&&mass.landingKg!==null&&Number.isFinite(mass.landingKg)&&!disabled;
 // A stale entry cannot appear or be exported even for the first render after inputs change.
 const result=permitted&&entry?.key===key?entry.result:null;
 const airportExpected=input.target==='alternate'?flight.alternate||'':flight.to;
 const blocked=[...(mass.errors||[]),...(blockReason?[blockReason]:[])];
 useEffect(()=>{
  const api={snapshot:()=>({status:result?.status||(entry?'stale':'not-calculated'),valid:result?.status==='engineering-feasible',result:result?structuredClone(result):null}),report:()=>{if(!result)throw Error('当前着陆结果未计算或已失效。');return landingReportHtml(result);}};
  (window as any).__LANDING_ENGINEERING__=api;
  return ()=>{if((window as any).__LANDING_ENGINEERING__===api)delete (window as any).__LANDING_ENGINEERING__;};
 });
 const change=(value:Partial<LandingInput>)=>onChange({...input,...value});
 const runway=(key:keyof LandingInput['runway'],value:string|number)=>change({runway:{...input.runway,[key]:value}});
 const weather=(key:keyof LandingInput['weather'],value:string|number)=>change({weather:{...input.weather,[key]:value}});
 const numberField=(label:string,value:number,handler:(value:number)=>void,step='1')=><label className="lf-field"><span>{label}</span><input type="number" aria-label={label} value={Number.isFinite(value)?value:''} step={step} onChange={event=>handler(event.target.value===''?NaN:Number(event.target.value))}/></label>;
 const textField=(label:string,value:string,handler:(value:string)=>void)=><label className="lf-field"><span>{label}</span><input aria-label={label} value={value} onChange={event=>handler(event.target.value.toUpperCase())}/></label>;
 const compute=()=>{if(permitted)setEntry({key,result:calculateLanding(input,mass.landingKg!,context)});};
 const exportResult=(format:'json'|'html')=>{if(!result)return;saveFile(`a330efb-engineering-landing-${result.status==='engineering-feasible'?'result':'diagnostic'}.${format}`,format==='json'?JSON.stringify({...result,parameters:landingParameters},null,2):landingReportHtml(result),format==='json'?'application/json;charset=utf-8':'text/html;charset=utf-8');};
 return <div className="engineering-landing" data-testid="engineering-landing">
  <div className="lf-warning"><b>工程着陆模型 · 未经航空性能校准</b><p>独立录入目的地 / 备降场条件，重量来自当前燃油规划。以下速度、摩擦系数和制动响应均为工程假设；不构成实际着陆或签派依据。</p></div>
  <div className="lf-toolbar"><label className="lf-field"><span>着陆目标</span><select aria-label="着陆目标" value={input.target} onChange={event=>change({target:event.target.value as LandingInput['target']})}><option value="destination">目的地 {flight.to}</option><option value="alternate">备降场 {flight.alternate||'未设置'}</option></select></label><button disabled={!airportExpected} onClick={()=>onChange(defaultLandingInput(airportExpected,input.target))}>重设为{input.target==='alternate'?'备降场':'目的地'}工程示例</button><span>计划着陆重量 <b data-testid="landing-mass">{n(mass.landingKg)} kg</b></span></div>
  <p className="lf-muted">{mass.source}。重设按钮将清除本页条件，载入所选机场的手工演示样例；请按需重新填写跑道与天气。</p>
  {input.airport!==airportExpected&&<p className="lf-error" role="alert">当前条件属于 {input.airport||'未指定机场'}，航班要求 {airportExpected||'未设置备降场'}。请显式重设或修改独立着陆条件。</p>}
  <div className="lf-cols"><section><h3>着陆跑道</h3><div className="lf-grid">
   {textField('着陆机场 ICAO',input.airport,value=>change({airport:value}))}{textField('着陆跑道编号',input.runway.ident,value=>runway('ident',value))}
   {numberField('着陆航向 (°)',input.runway.headingDeg,value=>runway('headingDeg',value))}{numberField('可用着陆距离 LDA (m)',input.runway.ldaM,value=>runway('ldaM',value))}
   {numberField('着陆机场标高 (ft)',input.runway.elevationFt,value=>runway('elevationFt',value))}{numberField('着陆跑道坡度 (%)',input.runway.slopePercent,value=>runway('slopePercent',value),'0.1')}
   <label className="lf-field"><span>着陆跑道状态</span><select aria-label="着陆跑道状态" value={input.runway.condition} onChange={event=>runway('condition',event.target.value)}><option value="dry">干</option><option value="wet">湿</option><option value="contaminated">污染（未支持）</option></select></label>
  </div><p className="lf-muted">跑道来源：{input.runway.source}。正坡度表示沿着陆方向上坡；LDA 已从着陆阈值计起，不再次扣减移位阈值。</p></section>
  <section><h3>着陆天气</h3><div className="lf-grid">
   {textField('着陆天气站 ICAO',input.weather.station,value=>weather('station',value))}{numberField('着陆温度 (°C)',input.weather.oatC,value=>weather('oatC',value))}
   {numberField('着陆 QNH (hPa)',input.weather.qnhHpa,value=>weather('qnhHpa',value),'0.01')}{numberField('着陆风向 (°)',input.weather.windDirDeg,value=>weather('windDirDeg',value))}
   {numberField('着陆稳定风 (kt)',input.weather.windKt,value=>weather('windKt',value))}{numberField('着陆阵风 (kt)',input.weather.gustKt,value=>weather('gustKt',value))}
  </div><p className="lf-muted">天气来源：{input.weather.source}。无阵风时阵风值填写稳定风速；风向与跑道航向须使用相同真 / 磁基准。</p></section></div>
  <section style={{marginTop:12}}><h3>着陆构型与工程余量</h3><div className="lf-grid" style={{gridTemplateColumns:'repeat(3,minmax(0,1fr))'}}>
   <label className="lf-field"><span>着陆构型</span><select aria-label="着陆构型" value={input.configuration} onChange={event=>change({configuration:event.target.value as LandingInput['configuration']})}><option value="FULL">FULL</option><option value="CONF3">CONF3</option></select></label>
   <label className="lf-field"><span>工程自动刹车档位</span><select aria-label="工程自动刹车档位" value={input.autobrake} onChange={event=>change({autobrake:event.target.value as LandingInput['autobrake']})}><option value="LOW">LOW</option><option value="MED">MED</option><option value="MAX">MAX（工程上限）</option></select></label>
   <label className="lf-field"><span>可用反推数量</span><select aria-label="可用反推数量" value={input.reversers} onChange={event=>change({reversers:Number(event.target.value) as LandingInput['reversers']})}><option value="2">2</option><option value="1">1</option><option value="0">0</option></select></label>
   {numberField('手工附加速度 (kt)',input.approachAdditiveKt,value=>change({approachAdditiveKt:value}))}{numberField('着陆距离系数',input.distanceFactor,value=>change({distanceFactor:value}),'0.01')}
  </div><p className="lf-muted">LOW / MED / MAX 表示本模型的总减速度假设，非飞机按钮的操作指导。默认距离系数 1.15；未处理故障或自动着陆修正。</p></section>
  {blocked.map((error,index)=><p key={index} className="lf-error" role="alert">{error}</p>)}
  {!permitted&&!blocked.length&&<p className="lf-error">先完成并确认当前配载与燃油规划，再计算着陆性能。</p>}
  <div className="lf-toolbar"><button className="primary" disabled={!permitted} onClick={compute}>计算工程着陆性能</button><button disabled={!result} onClick={()=>exportResult('json')}>导出着陆结果 JSON</button><button disabled={!result} onClick={()=>exportResult('html')}>导出着陆报告 HTML</button></div>
  <div className={'lf-result '+(entry&&!result?'stale':'')} data-testid="landing-result" data-status={result?.status||(entry?'stale':'waiting')} data-valid={result?.status==='engineering-feasible'?'true':'false'} aria-live="polite"><b>{result?statusLabel[result.status]:entry?'着陆结果已失效 — 请按当前输入重新计算':'等待工程着陆计算'}</b>
   {result&&<>{result.solution&&<><div className="engineering-speeds"><div><span>工程 Vref · CAS</span><strong>{n(result.solution.vrefKt,1)}<small> kt</small></strong></div><div><span>工程 Vapp · CAS</span><strong>{n(result.solution.vappKt,1)}<small> kt</small></strong></div><div><span>LDA {result.solution.marginM<0?'不足':'余量'}</span><strong>{n(Math.abs(result.solution.marginM))}<small> m</small></strong></div></div><dl className="engineering-distances"><div><dt>空中段 / 制动延迟 / 滑跑</dt><dd>{n(result.solution.airDistanceM)} / {n(result.solution.delayDistanceM)} / {n(result.solution.brakingDistanceM)} m</dd></div><div><dt>未乘系数 / 乘系数后距离</dt><dd>{n(result.solution.unfactoredDistanceM)} / {n(result.solution.requiredDistanceM)} m</dd></div><div><dt>场长工程限重 · 100 kg 档位</dt><dd>{result.solution.fieldLimitKg===null?'无可行档位':n(result.solution.fieldLimitKg)+' kg'}</dd></div><div><dt>限制原因</dt><dd>{result.solution.limitReason}</dd></div></dl><p className="lf-muted">采用速度附加量 {n(result.solution.additiveKt,1)} kt；模型上限不等于经审定结构限值。</p></>}
   {result.environment&&<p className="lf-muted">压力高度 {n(result.environment.pressureAltitudeFt)} ft · 密度 {n(result.environment.densityKgM3,3)} kg/m³ · 迎风 {n(result.environment.headwindKt,1)} kt · 侧风 {n(Math.abs(result.environment.crosswindKt),1)} kt</p>}
   {[...result.errors,...result.warnings].map((error,index)=><p key={index} className={result.errors.includes(error)?'lf-error':'lf-muted'}>{error}</p>)}<p className="lf-muted">模型 {result.model.version} · {result.at} · 重量来源 {result.context.massSource}</p></>}
  </div>
  {result?.solution&&<figure className="engineering-chart" data-testid="landing-chart" dangerouslySetInnerHTML={{__html:landingChartSvg(result)}}/>}
  <details className="engineering-assumptions"><summary>工程假设、参数与参考资料</summary>{landingParameters.assumptions.map((item,index)=><p key={index}>{item}</p>)}<p>支持 120–191 t、压力高度 −1000–8000 ft、温度 −20–45 °C、坡度 ±2%、干 / 湿跑道。支持边界均为演示模型约束。</p>{landingParameters.sources.map(source=><p key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> — {source.use}</p>)}<pre>{JSON.stringify(landingParameters,null,2)}</pre></details>
 </div>;
}
