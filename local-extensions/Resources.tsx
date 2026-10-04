import React,{useEffect,useRef,useState} from 'react';
import {useLocal,editFlight,notice} from './state';
import {storageName} from '../local-efb/presentation-mode';
import {weatherSamples,sampleWeather} from './weather';
import {adoptDepartureWeather} from './departure-review';
import {PdfReader} from './PdfReader';
import {loadPdf} from './pdf-library';
import './local.css';
type Chart={id:string;airport:string;title:string;url:string;format:'image'|'pdf';source:string};
export const charts:Chart[]=[
 {id:'zutf-layout',airport:'ZUTF',title:'机场布局示意',url:'/demo-assets/airport-layout.svg',format:'image',source:'A330EFB 自制示意图 2026-10-04'},
 {id:'zspd-brief',airport:'ZSPD',title:'进近资料阅读示意',url:'/demo-assets/arrival-brief.svg',format:'image',source:'A330EFB 自制示意图 2026-10-04'}
];
const prefs=storageName('A330_LOCAL_CHART_PREFS');
function loadPrefs(){try{const p=JSON.parse(localStorage.getItem(prefs)||'{}');return {id:charts.some(c=>c.id===p.id)?p.id:charts[0].id,pinned:Array.isArray(p.pinned)?p.pinned.filter((id:any)=>charts.some(c=>c.id===id)):[]};}catch{return {id:charts[0].id,pinned:[] as string[]};}}

export function LocalChartsPage({pinnedOnly=false}:{pinnedOnly?:boolean}){
 const initial=useRef(loadPrefs()).current;
 const [selected,setSelected]=useState<Chart>(charts.find(c=>pinnedOnly?initial.pinned.includes(c.id):c.id===initial.id)||charts[0]),[pinned,setPinned]=useState<string[]>(initial.pinned);
 const [query,setQuery]=useState(''),[zoom,setZoom]=useState(1),[rotation,setRotation]=useState(0),[message,setMessage]=useState('内置图件用于功能演示，非机场权威航图。');
 const [imported,setImported]=useState<Chart|null>(null),objectUrl=useRef<string|null>(null),importTicket=useRef(0);
 useEffect(()=>()=>{importTicket.current++;if(objectUrl.current)URL.revokeObjectURL(objectUrl.current);},[]);
 useEffect(()=>{try{localStorage.setItem(prefs,JSON.stringify({id:charts.some(c=>c.id===selected.id)?selected.id:initial.id,pinned}));}catch{setMessage('浏览器未能保存收藏，本次阅读仍可继续。');}},[selected.id,pinned]);
 const choose=(c:Chart)=>{setSelected(c);setZoom(1);setRotation(0);setMessage(c.source);};
 async function importFile(file:File){
  const ticket=++importTicket.current;
  try{
   if(!file.size||file.size>20*1024*1024)throw Error('请选择不超过 20 MB 的 PDF、PNG 或 JPEG');
   const bytes=new Uint8Array(await file.slice(0,8).arrayBuffer());
   const pdf=String.fromCharCode(...bytes.slice(0,5))==='%PDF-';
   const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
   const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
   if(!pdf&&!png&&!jpeg)throw Error('文件内容不是支持的 PDF、PNG 或 JPEG');
   if(pdf&&!/%%EOF\s*$/.test(await file.slice(Math.max(0,file.size-1024)).text()))throw Error('PDF 文件不完整，缺少结束标记');
   if(ticket!==importTicket.current)return;
   const url=URL.createObjectURL(new Blob([file],{type:pdf?'application/pdf':png?'image/png':'image/jpeg'}));
   if(pdf){let task:any;try{task=await loadPdf(url);const doc=await task.promise;if(!doc.numPages)throw Error('PDF 没有可读取页面');}catch(e){URL.revokeObjectURL(url);throw e;}finally{await task?.destroy();}}
   if(!pdf){try{await new Promise<void>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve();img.onerror=()=>reject(Error('图片内容无法解码'));img.src=url;});}catch(e){URL.revokeObjectURL(url);throw e;}}
   if(ticket!==importTicket.current){URL.revokeObjectURL(url);return;}
   if(objectUrl.current)URL.revokeObjectURL(objectUrl.current);objectUrl.current=url;
   const chart:Chart={id:'imported',airport:'本机文件',title:file.name,url,format:pdf?'pdf':'image',source:'用户选择的本机文件，仅保留在本次页面会话'};
   setImported(chart);choose(chart);
  }catch(e){if(ticket===importTicket.current)setMessage('导入失败，保留当前图件：'+(e as Error).message);}
 }
 const choices=[...charts,...(imported?[imported]:[])].filter(c=>(!pinnedOnly||pinned.includes(c.id))&&(c.airport+' '+c.title).toLowerCase().includes(query.toLowerCase()));
 return <div className="lf-root resource-root" data-testid="offline-charts"><div className="lf-heading"><div><h2>离线资料</h2><p>机场示意与本机文档阅读</p></div><span className="lf-chip">演示资料 非导航用途</span></div>
  <div className="lf-toolbar"><label className="lf-field">检索机场或标题<input aria-label="资料检索" value={query} onChange={e=>setQuery(e.target.value)}/></label><label className="lf-file">打开 PDF 或图片<input type="file" aria-label="打开本机资料" accept=".pdf,.png,.jpg,.jpeg" onChange={e=>{const f=e.target.files?.[0];if(f)void importFile(f);e.target.value='';}}/></label><span className="lf-muted">上限 20 MB · 本机文件不上传</span></div>
  <div className="lf-message" role="status">{message}</div><div className="resource-grid"><aside>{choices.length?choices.map(c=><button key={c.id} className={selected.id===c.id?'selected':''} onClick={()=>choose(c)}><b>{c.airport}</b><span>{pinned.includes(c.id)?'★ ':''}{c.title}</span></button>):<p>没有匹配的资料</p>}</aside>
  {(!pinnedOnly||pinned.includes(selected.id))?<section><h3>{selected.airport} · {selected.title}</h3><div className="lf-toolbar">
   <button onClick={()=>setZoom(z=>Math.min(3,z+.25))}>放大</button><button onClick={()=>setZoom(z=>Math.max(.5,z-.25))}>缩小</button><button onClick={()=>setRotation(r=>(r+90)%360)}>旋转</button><button onClick={()=>{setZoom(1);setRotation(0);}}>复位视图</button>
   <button disabled={selected.id==='imported'} onClick={()=>setPinned(p=>p.includes(selected.id)?p.filter(id=>id!==selected.id):[...p,selected.id])}>{pinned.includes(selected.id)?'取消收藏':'收藏图件'}</button><a href={selected.url} target="_blank" rel="noreferrer">单独打开</a>
  </div><div className="chart-viewport" data-testid="chart-viewport">{selected.format==='pdf'?<PdfReader key={selected.url} url={selected.url} zoom={zoom} rotation={rotation}/>:<div className="chart-sheet" style={{width:`${zoom*100}%`,minHeight:rotation%180?'900px':undefined}}><img alt={selected.title+' 演示示意图'} src={selected.url} style={{transform:`rotate(${rotation}deg)`}}/></div>}</div>
  <p className="lf-muted">{selected.source}。PDF 在本机渲染，支持分页、缩放及旋转。</p></section>:<section><h3>收藏资料</h3><p>请在“本地文件”页面收藏图件，或从左侧选择已有收藏。</p></section>}</div></div>;
}

export function LocalWeatherPage(){
 const s=useLocal();const [id,setId]=useState(weatherSamples.find(w=>w.station===s.flight.from)?.id||weatherSamples[0].id);
 const sample=weatherSamples.find(w=>w.id===id)!;
 return <div className="lf-root" data-testid="offline-weather"><div className="lf-heading"><div><h2>天气资料</h2><p>选择资料后明确采用到当前航班</p></div><span className="lf-chip">本地样例 非实况</span></div>
  <div className="lf-toolbar"><label>天气样例 <select aria-label="天气样例" value={id} onChange={e=>setId(e.target.value)}>{weatherSamples.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label></div>
  <section><h3>{sample.station} · {sample.name}</h3><p>资料来源：A330EFB 自制天气样例</p><p>样例观测时间：{sample.observedAt} UTC</p><pre className="weather-raw">{sample.raw}</pre><div className="lf-metrics"><div>风向<strong>{sample.windDir}°</strong></div><div>风速<strong>{sample.windKt} kt</strong></div><div>气温<strong>{sample.oat} °C</strong></div><div>气压<strong>{sample.qnh} hPa</strong></div></div>
  <button className="primary" disabled={sample.station!==s.flight.from||s.storageConflict} onClick={()=>{editFlight(adoptDepartureWeather(s.flight,sampleWeather(sample)));notice('已采用本地天气样例；请重新确认计划并计算。');}}>采用到当前航班</button><p>当前航班 {s.flight.number}，起飞机场 {s.flight.from}。{sample.station!==s.flight.from?'所选样例机场不同，不能采用。':'采用后，旧确认与计算结果失效。'}</p></section><div className="lf-message" role="status">{s.notice}</div><p className="lf-muted">该资料为固定教学场景，不表示当前机场实况。未提供的机场继续使用手工天气输入。</p></div>;
}
