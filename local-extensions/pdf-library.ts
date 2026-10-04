import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

export async function loadPdf(url:string) {
 const pdfjs=await import('pdfjs-dist');
 pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;
 return pdfjs.getDocument({url,cMapUrl:'/pdfjs/cmaps/',cMapPacked:true,
  standardFontDataUrl:'/pdfjs/standard_fonts/',wasmUrl:'/pdfjs/wasm/',isEvalSupported:false});
}
