import React, {useEffect, useRef, useState} from 'react';
import {Flight, signature, weights} from './flight';
import {download, editFlight, getState, notice, useLocal} from './state';
import {calculateTakeoff, MODEL_VERSION, modelParameters} from './takeoff';
import type {Mode, TakeoffResult} from './takeoff/types';

type RecordEntry = {key:string; result:TakeoffResult};
let sessionHistory:TakeoffResult[] = [];
const n = (value:number|null|undefined, decimals=1) => typeof value==='number' && Number.isFinite(value) ? value.toLocaleString('en-US',{maximumFractionDigits:decimals,minimumFractionDigits:decimals}) : '—';
const esc = (value:unknown) => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const modelSignature = JSON.stringify({version:MODEL_VERSION, parameters:modelParameters});
const keyFor = (flight:Flight, mode:Mode, maxFlexC:number) => JSON.stringify({flight:signature(flight), mode, maxFlexC:mode==='FLEX'?maxFlexC:null, modelSignature});
const limitsText = '本结果仅用于投标演示。飞机与发动机专用参数均为公开列示的工程假设，未经航空性能校准。未覆盖障碍物净空、认证净航迹、刹车能量、轮胎限制、VMCA/VMCG、湿及污染跑道、防冰和引气修正。';
const statusText = (result:TakeoffResult) => ({'engineering-feasible':'工程约束满足 · 仅在本模型内成立','engineering-infeasible':'工程约束不满足 · 不输出建议速度','unsupported':'超出工程模型支持范围','invalid':'输入无效 · 未生成工程解'}[result.status]);

/** SVG is produced from the selected numerical solution, never from sample artwork. */
function chartSvg(result:TakeoffResult):string {
  const solution = result.solution, available=result.available;
  if (!solution || !available) return '';
  const stop=solution.trajectory.accelerateStop, go=solution.trajectory.continueTakeoff;
  const points=[...stop,...go];
  if (!points.length || points.some(point=>!Number.isFinite(point.distanceM)||!Number.isFinite(point.speedKt))) return '';
  const width=680, left=58, right=18, top=36, plotHeight=210, plotWidth=width-left-right;
  const maxDistance=Math.max(1,available.toraM,available.todaM,available.asdaM,...points.map(p=>p.distanceM))*1.05;
  const maxSpeed=Math.ceil(Math.max(solution.v2Kt,...points.map(p=>p.speedKt))/20)*20;
  const x=(distance:number)=>left+distance/maxDistance*plotWidth;
  const y=(speed:number)=>top+plotHeight-speed/maxSpeed*plotHeight;
  const path=(data:typeof points)=>data.map((point,index)=>`${index?'L':'M'} ${x(point.distanceM).toFixed(2)} ${y(point.speedKt).toFixed(2)}`).join(' ');
  const grid=Array.from({length:5},(_,i)=>{const speed=i*maxSpeed/4;return `<line x1="${left}" x2="${width-right}" y1="${y(speed)}" y2="${y(speed)}" stroke="#536071" stroke-opacity=".3"/><text x="${left-8}" y="${y(speed)+4}" text-anchor="end">${Math.round(speed)}</text>`;}).join('');
  const ticks=Array.from({length:5},(_,i)=>{const distance=i*maxDistance/4;return `<text x="${x(distance)}" y="${top+plotHeight+20}" text-anchor="middle">${Math.round(distance)}</text>`;}).join('');
  const strips=[['TORA',available.toraM,solution.torM,'#84b5eb'],['TODA',available.todaM,solution.todM,'#39ad99'],['ASDA',available.asdaM,solution.asdM,'#ce9238']] as const;
  const bands=strips.map(([label,distance,required,color],i)=>{const by=top+plotHeight+70+i*46;return `<text x="${left-8}" y="${by+12}" text-anchor="end">${label}</text><rect x="${left}" y="${by}" width="${x(distance)-left}" height="16" fill="${color}" fill-opacity=".22"/><rect x="${left}" y="${by+5}" width="${Math.max(0,x(required)-left)}" height="6" fill="${color}"/><line x1="${x(distance)}" x2="${x(distance)}" y1="${by-3}" y2="${by+20}" stroke="${color}"/><text x="${left}" y="${by+33}" font-size="12">模型需求 ${Math.round(required)} m / 可用 ${Math.round(distance)} m</text>`;}).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 450" role="img" aria-label="工程起飞速度与距离曲线、跑道声明距离余量" style="width:100%;height:auto;color:inherit;font:14px Arial,sans-serif"><title>由当前工程模型求解轨迹绘制的速度—距离图</title><g fill="currentColor"><text x="${left}" y="16">CAS (kt)</text>${grid}${ticks}<text x="${width-right}" y="${top+plotHeight+40}" text-anchor="end">地面距离 (m)</text><path d="${path(stop)}" fill="none" stroke="#ce9238" stroke-width="3"/><path d="${path(go)}" fill="none" stroke="#39ad99" stroke-width="3"/><text x="${width-236}" y="16" fill="#39ad99">继续起飞</text><text x="${width-126}" y="16" fill="#ce9238">加速停止</text>${bands}</g></svg><figcaption style="font-size:12px;line-height:1.6;margin:6px 4px">细实条为模型需求；浅色条为声明可用距离。曲线速度为 CAS，横轴按地速积分。</figcaption>`;
}

function reportFor(result:TakeoffResult):string {
  const solution=result.solution;
  const title=solution?'工程起飞结果报告':'工程起飞诊断报告';
  const solutionHtml=solution?`<h2>工程求解结果</h2><p>V1 ${n(solution.v1Kt)} kt · VR ${n(solution.vrKt)} kt · V2 ${n(solution.v2Kt)} kt（CAS）</p><p>推力方式 ${esc(solution.thrustMode)}；假定温度 ${solution.assumedTemperatureC===null?'不适用':n(solution.assumedTemperatureC)+' °C'}；推力系数 ${n(solution.thrustRatio,3)}</p><p>加速停止距离 ${n(solution.asdM)} m；起飞距离 ${n(solution.todM)} m；起飞地面距离 ${n(solution.torM)} m。</p><p>ASDA 余量 ${n(solution.margins.asdaM)} m；TODA 余量 ${n(solution.margins.todaM)} m；TORA 余量 ${n(solution.margins.toraM)} m。</p><p>单发工程爬升梯度 ${n(solution.climbGradient*100,2)}%；TOGA 工程限重 ${n(solution.runwayLimitKg,0)} kg；控制因素 ${esc(solution.limitingFactor)}。</p><figure>${chartSvg(result)}</figure>`:'<p>本次未生成可行工程解，不输出 V1、VR、V2 或 FLEX 数值。下列内容仅用于诊断。</p>';
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>A330EFB ${title}</title><style>body{max-width:900px;margin:36px auto;padding:0 24px;color:#182b3c;font:15px/1.6 Arial,"Microsoft YaHei",sans-serif}h1{font-size:26px}h2{font-size:20px;margin-top:28px}.scope{border:2px solid #ad7b31;padding:16px;background:#fff8ec}pre{font:11px/1.5 Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}figure{margin:20px 0;break-inside:avoid}button{padding:8px 16px}@media print{button{display:none}body{margin:0;max-width:none}h2{break-after:avoid}}</style></head><body><button onclick="window.print()">打印 / 保存为 PDF</button><h1>A330EFB ${title}</h1><p class="scope"><b>工程模型 · 未经航空性能校准 · 仅用于投标演示</b><br>${esc(limitsText)}</p><p>状态：${esc(result.label)} (${esc(result.status)})</p><p>航班 ${esc(result.input.number)} · ${esc(result.input.date)} · ${esc(result.input.from)} / ${esc(result.input.runway.ident)} · TOW ${n(weights(result.input).tow,0)} kg</p><p>模型 ${esc(result.model.id)} / ${esc(result.model.version)} · 生成 ${esc(result.at)}</p>${solutionHtml}<h2>诊断与提示</h2><ul>${[...result.errors,...result.warnings,...result.diagnostics.reasons].map(item=>`<li>${esc(item)}</li>`).join('')}</ul><p>TOGA 工程限重 ${n(result.diagnostics.runwayLimitKg,0)} kg；控制因素 ${esc(result.diagnostics.limitingFactor)}；重量搜索步长 ${n(result.diagnostics.massResolutionKg,0)} kg；V1 步长 ${n(result.diagnostics.v1ResolutionKt)} kt；FLEX 步长 ${n(result.diagnostics.flexResolutionC,0)} °C。</p><h2>输入快照与计算选项</h2><pre>${esc(JSON.stringify({flight:result.input,options:result.options},null,2))}</pre><h2>参数来源、假设与未覆盖项目</h2><pre>${esc(JSON.stringify(modelParameters,null,2))}</pre><h2>完整计算结果与轨迹</h2><pre>${esc(JSON.stringify(result,null,2))}</pre></body></html>`;
}

export function EngineeringTakeoff() {
  const state=useLocal();
  const [mode,setMode]=useState<Mode>('TOGA');
  const [maxFlexC,setMaxFlexC]=useState<number>(modelParameters.engine.maximumFlexC);
  const [entry,setEntry]=useState<RecordEntry|null>(null);
  const [history,setHistory]=useState(sessionHistory);
  const [busy,setBusy]=useState(false);
  const [attempted,setAttempted]=useState(false);
  const sequence=useRef(0), mounted=useRef(true);
  const key=keyFor(state.flight,mode,maxFlexC);
  const optionsError=mode==='FLEX'&&(!Number.isFinite(maxFlexC)||maxFlexC<modelParameters.envelope.temperatureMinC||maxFlexC>modelParameters.engine.maximumFlexC)?`FLEX 上限须为 ${modelParameters.envelope.temperatureMinC}–${modelParameters.engine.maximumFlexC} °C 的有限数。`:'';
  const current=():TakeoffResult|null=>{
    const latest=getState();
    return entry && !optionsError && entry.key===keyFor(latest.flight,mode,maxFlexC) && latest.confirmed===signature(latest.flight) && !latest.groundChanged && !latest.storageConflict ? entry.result : null;
  };
  const result=current(), feasible=result?.status==='engineering-feasible';
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;sequence.current++;};},[]);
  useEffect(()=>{if(entry&&!current())setEntry(null);},[key,state.confirmed,state.groundChanged,state.storageConflict]);
  useEffect(()=>{
    const api={snapshot:()=>{const latest=current();return {status:busy?'calculating':latest?.status||(attempted?'stale':'not-calculated'),valid:latest?.status==='engineering-feasible',mode,result:latest?structuredClone(latest):null};},report:()=>{const latest=current();if(!latest)throw Error('当前工程结果不可导出：输入未确认、已过期或存储冲突。');return reportFor(latest);}};
    (window as any).__TAKEOFF_ENGINEERING__=api;
    return()=>{if((window as any).__TAKEOFF_ENGINEERING__===api)delete (window as any).__TAKEOFF_ENGINEERING__;};
  });
  const compute=()=>{
    const latest=getState();
    if(optionsError){notice(optionsError);return;}
    if(latest.storageConflict||latest.confirmed!==signature(latest.flight)||latest.groundChanged){notice('请先保存并确认当前航班重量；有窗口冲突时先读取最新版本。');return;}
    const flight=structuredClone(latest.flight), capturedKey=keyFor(flight,mode,maxFlexC), request=++sequence.current;
    setBusy(true);setEntry(null);setAttempted(true);
    notice('正在求解 V1、TOGA 限重及推力条件，请稍候。');
    window.setTimeout(()=>{
      try {
        const next=calculateTakeoff(flight,{mode,...(mode==='FLEX'?{maxFlexC}:{})});
        if(mounted.current && request===sequence.current) {
          const latestState=getState();
          if(capturedKey===keyFor(latestState.flight,mode,maxFlexC)&&latestState.confirmed===signature(latestState.flight)&&!latestState.groundChanged&&!latestState.storageConflict) {
            setEntry({key:capturedKey,result:next});notice(next.label);
          } else notice('求解期间输入或确认状态发生变化，请重新计算。');
        }
      } catch(error) {if(mounted.current)notice('工程计算未完成：'+String((error as Error).message));}
      finally {if(mounted.current&&request===sequence.current)setBusy(false);}
    },30);
  };
  const exportCurrent=(format:'json'|'html')=>{
    const latest=current();
    if(!latest){notice('结果已失效，请重新确认并计算。');return;}
    const kind=latest.status==='engineering-feasible'?'result':'diagnostic';
    download(`a330efb-engineering-takeoff-${kind}.${format}`,format==='html'?reportFor(latest):{...latest,parameters:modelParameters});
  };
  const save=()=>{
    const latest=current();
    if(latest?.status!=='engineering-feasible'){notice('只有当前可行工程解可以保存到本次会话。');return;}
    sessionHistory=[structuredClone(latest),...sessionHistory].slice(0,20);setHistory(sessionHistory);notice('工程解已保存到本次会话；刷新浏览器后不保留，可导出文件存档。');
  };
  return <div className="engineering-takeoff" data-testid="engineering-takeoff">
    <div className="lf-warning"><b>工程模型 · 未经航空性能校准</b><p>当前飞机和发动机参数为工程假设。只判断本模型内的约束可行性，不构成实际起飞或签派依据。</p></div>
    <div className="lf-toolbar"><span>推力方式</span><button aria-pressed={mode==='TOGA'} disabled={busy} className={mode==='TOGA'?'primary':''} onClick={()=>setMode('TOGA')}>使用 TOGA</button><button aria-pressed={mode==='FLEX'} disabled={busy} className={mode==='FLEX'?'primary':''} onClick={()=>setMode('FLEX')}>使用 FLEX</button>{mode==='FLEX'&&<label className="lf-field"><span>FLEX 上限 (°C)</span><input type="number" data-field="maxFlexC" aria-label="FLEX 上限 (°C)" min={modelParameters.envelope.temperatureMinC} max={modelParameters.engine.maximumFlexC} step="1" disabled={busy} value={Number.isFinite(maxFlexC)?maxFlexC:''} onChange={event=>setMaxFlexC(event.target.value===''?NaN:Number(event.target.value))}/></label>}</div>
    {optionsError&&<p className="lf-error" role="alert">{optionsError}</p>}
    <button className="primary" disabled={busy||!!optionsError||state.storageConflict} onClick={compute}>计算工程起飞性能</button>
    <p className="lf-muted" role="status">{busy?'正在计算，请稍候；完成后显示本次输入对应的结果。':'先保存并确认重量，再进行计算。FLEX 无减推余度时，模型尝试回退 TOGA。'}</p>
    <div className={'lf-result engineering-result '+(attempted&&!result&&!busy?'stale':'')} data-testid="engineering-result" data-status={busy?'calculating':result?.status||'waiting'} aria-live="polite">
      <b>{busy?'正在求解工程模型':result?statusText(result):attempted?'结果已失效 — 请重新确认并计算':'等待工程起飞计算'}</b>
      {result&&<>
        {result.solution&&<><div className="engineering-speeds">{([['V1',result.solution.v1Kt],['VR',result.solution.vrKt],['V2',result.solution.v2Kt]] as const).map(([label,value])=><div key={label}><span>{label} · CAS</span><strong>{n(value)}<small> kt</small></strong></div>)}</div><p>推力方式 <b>{result.solution.thrustMode}</b> · 假定温度 <b>{result.solution.assumedTemperatureC===null?'不适用':`${n(result.solution.assumedTemperatureC,0)} °C`}</b> · 推力系数 {n(result.solution.thrustRatio,3)}</p><dl className="engineering-distances"><div><dt>加速停止距离 / ASDA 余量</dt><dd>{n(result.solution.asdM,0)} / {n(result.solution.margins.asdaM,0)} m</dd></div><div><dt>起飞距离 / TODA 余量</dt><dd>{n(result.solution.todM,0)} / {n(result.solution.margins.todaM,0)} m</dd></div><div><dt>起飞地面距离 / TORA 余量</dt><dd>{n(result.solution.torM,0)} / {n(result.solution.margins.toraM,0)} m</dd></div><div><dt>单发工程爬升梯度</dt><dd>{n(result.solution.climbGradient*100,2)} %</dd></div></dl></>}
        <p>TOGA 工程限重 <b>{n(result.diagnostics.runwayLimitKg,0)} kg</b><br/>控制因素：{result.diagnostics.limitingFactor}</p>
        {result.environment&&<p className="lf-muted">压力高度 {n(result.environment.pressureAltitudeFt,0)} ft · 空气密度 {n(result.environment.densityKgM3,3)} kg/m³<br/>迎风 {n(result.environment.headwindKt)} kt · 侧风 {n(result.environment.crosswindKt)} kt</p>}
        {[...result.errors,...result.warnings,...result.diagnostics.reasons].filter((value,index,all)=>all.indexOf(value)===index).map((message,index)=><p key={index} className={result.errors.includes(message)?'lf-error':'lf-muted'}>{message}</p>)}
        <p className="lf-muted">模型 {result.model.version} · {result.at}<br/>计算用时 {n(result.diagnostics.elapsedMs,0)} ms；限重搜索步长 {n(result.diagnostics.massResolutionKg,0)} kg。</p>
      </>}
    </div>
    {result?.solution&&<figure className="engineering-chart" data-testid="engineering-chart" dangerouslySetInnerHTML={{__html:chartSvg(result)}}/>}
    <div className="lf-toolbar"><button disabled={!feasible||busy} onClick={save}>保存工程记录</button><button disabled={!result||busy} onClick={()=>exportCurrent('json')}>{result&&!feasible?'导出工程诊断 JSON':'导出工程结果 JSON'}</button><button disabled={!result||busy} onClick={()=>exportCurrent('html')}>{result&&!feasible?'导出工程诊断 HTML':'导出工程报告 HTML'}</button></div>
    <details className="engineering-assumptions"><summary>查看模型假设、参数与未覆盖项目</summary><p>{limitsText}</p><p>模型版本：{MODEL_VERSION}。全部飞机专用系数属于工程假设；来源状态和每项参数随报告一并导出。</p><pre>{JSON.stringify(modelParameters,null,2)}</pre></details>
    <details className="engineering-history"><summary>本次会话工程记录 ({history.length})</summary><p className="lf-muted">最多 20 条，与旧 V2 参考核算记录分开。恢复输入后须重新确认并计算；刷新页面后记录清空。</p>{history.map((saved,index)=><div className="lf-history" key={`${saved.at}-${index}`}><span>{saved.input.number} · {saved.input.from}/{saved.input.runway.ident}<br/>{saved.options.mode||'TOGA'} · {saved.at}</span><button disabled={busy||state.storageConflict} onClick={()=>{editFlight(structuredClone(saved.input));setMode(saved.options.mode||'TOGA');setMaxFlexC(saved.options.maxFlexC??modelParameters.engine.maximumFlexC);setEntry(null);setAttempted(true);notice('已恢复工程记录输入，请重新保存确认并计算。');}}>恢复工程输入（需重算）</button></div>)}</details>
  </div>;
}
