const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'dist');const portArg=process.argv.indexOf('--port');const port=Number(portArg>=0?process.argv[portArg+1]:process.env.EFB_PORT||9697);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local EFB port');
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.json5':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ttf':'font/ttf','.woff':'font/woff','.woff2':'font/woff2'};
http.createServer((req,res)=>{
 if(req.url==='/__health'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({application:'a330efb',mode:'browser-development',presentation:fs.existsSync(path.join(root,'demo.html')),headwind:'41eace79ed442696a6361dc72947954c9a6cf5cb'}));}
 let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}
 let file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);return res.end();}
 if(!path.extname(name))file=path.join(root,'index.html');
 fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404);return res.end('Not found');}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});fs.createReadStream(file).pipe(res);});
}).listen(port,'127.0.0.1',()=>console.log('A330EFB local demonstration: http://127.0.0.1:'+port));
