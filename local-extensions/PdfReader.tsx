import React,{useEffect,useRef,useState} from 'react';
import type {PDFDocumentProxy,RenderTask} from 'pdfjs-dist';
import {loadPdf} from './pdf-library';

export function PdfReader({url,zoom,rotation}:{url:string;zoom:number;rotation:number}){
 const [pdf,setPdf]=useState<PDFDocumentProxy|null>(null),[page,setPage]=useState(1),[message,setMessage]=useState('正在读取 PDF…');
 const container=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  let cancelled=false,task:any;setPdf(null);setPage(1);setMessage('正在读取 PDF…');
  void loadPdf(url).then(async t=>{task=t;if(cancelled){await t.destroy();return;}const doc=await t.promise;if(!cancelled)setPdf(doc);}).catch(e=>{if(!cancelled)setMessage('PDF 无法读取：'+e.message);});
  return()=>{cancelled=true;void task?.destroy();};
 },[url]);
 useEffect(()=>{
  if(!pdf)return;let cancelled=false,render:RenderTask|undefined;setMessage('正在绘制页面…');
  void pdf.getPage(page).then(async p=>{
   if(cancelled||!container.current)return;
   const original=p.getViewport({scale:1,rotation:(p.rotate+rotation)%360});
   const scale=Math.min(3,Math.max(.25,(container.current.clientWidth-30)/original.width))*zoom;
   const viewport=p.getViewport({scale,rotation:(p.rotate+rotation)%360});
   const pixelScale=Math.min(2,window.devicePixelRatio||1,4000/Math.max(viewport.width,viewport.height));
   const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width*pixelScale);canvas.height=Math.ceil(viewport.height*pixelScale);canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';canvas.setAttribute('aria-label','PDF 第 '+page+' 页');
   render=p.render({canvas,viewport,transform:[pixelScale,0,0,pixelScale,0,0]});await render.promise;
   if(!cancelled&&container.current){canvas.dataset.page=String(page);container.current.replaceChildren(canvas);setMessage('第 '+page+' / '+pdf.numPages+' 页');}
  }).catch(e=>{if(!cancelled)setMessage('页面读取失败：'+e.message);});
  return()=>{cancelled=true;render?.cancel();};
 },[pdf,page,zoom,rotation]);
 return <div className="pdf-viewer"><div className="pdf-pagination"><button disabled={!pdf||page<=1} onClick={()=>setPage(p=>p-1)}>上一页</button><button disabled={!pdf||page>=pdf.numPages} onClick={()=>setPage(p=>p+1)}>下一页</button><p role="status" data-testid="pdf-status">{message}</p></div><div ref={container} data-testid="pdf-canvas"/></div>;
}
