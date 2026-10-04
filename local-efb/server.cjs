const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {inspect,readManifest}=require('../scripts/build-identity.cjs');
const projectRoot=path.resolve(__dirname,'..'),initial=inspect(projectRoot);
if(!initial.sourceCurrent)throw Error('Build does not match this project source. Run Build-EFB.ps1 / npm run build before starting.');
const root=path.resolve(__dirname,'dist');const portArg=process.argv.indexOf('--port');const port=Number(portArg>=0?process.argv[portArg+1]:process.env.EFB_PORT||9697);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local EFB port');
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.mjs':'application/javascript; charset=utf-8','.wasm':'application/wasm','.pdf':'application/pdf','.css':'text/css; charset=utf-8','.json':'application/json','.json5':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ttf':'font/ttf','.woff':'font/woff','.woff2':'font/woff2'};
http.createServer((req,res)=>{
 let current,error;try{current=req.url==='/__health'?inspect(projectRoot):{...initial,build:readManifest(projectRoot)};}catch(cause){error=cause.message;}
 const ready=!!current&&current.sourceCurrent&&current.build.buildId===initial.build.buildId;
 if(req.url==='/__health'){
  res.writeHead(ready?200:409,{'Content-Type':'application/json','Cache-Control':'no-store'});
  return res.end(JSON.stringify({...initial,...(ready?current:{}),sourceCurrent:current?.sourceCurrent??false,onDiskBuildId:current?.build.buildId??null,processId:process.pid,mode:'browser-demonstration',ready,staleBuild:!ready,error:ready?null:error||'The project source or build changed after this server started. Rebuild if necessary, then stop and restart this project server.'}));
 }
 if(!ready){res.writeHead(503,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});return res.end('A330EFB 构建已改变或失效。请重新构建，并停止后重启本目录的服务。');}
 let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}
 let file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);return res.end();}
 if(!path.extname(name))file=path.join(root,'index.html');
 fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404);return res.end('Not found');}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});fs.createReadStream(file).pipe(res);});
}).listen(port,'127.0.0.1',()=>console.log('A330EFB local demonstration: http://127.0.0.1:'+port));
