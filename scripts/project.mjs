import {spawnSync,spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');process.chdir(root);
function run(command,args=[],options={}){const result=spawnSync(command,args,{cwd:root,stdio:'inherit',...options});if(result.error)throw result.error;if(result.status!==0)throw Error(`${command} exited with ${result.status}`);}
function python(){for(const candidate of [process.env.PYTHON,process.platform==='win32'?'python':'python3','python'].filter(Boolean)){const r=spawnSync(candidate,['--version'],{encoding:'utf8'});if(r.status===0&&/Python 3\.(1[0-9]|[2-9][0-9])\./.test(r.stdout+r.stderr))return candidate;}throw Error('Python 3.10+ is required. Install it or set PYTHON to its executable path.');}
const command=process.argv[2];
async function ui(){
 if(!fs.existsSync('local-efb/dist/demo.html'))throw Error('Run npm run build before UI tests.');
 const port=Number(process.env.EFB_TEST_PORT||19798),base=`http://127.0.0.1:${port}`;
 try{await fetch(base+'/__health',{signal:AbortSignal.timeout(700)});throw Error(`Test port ${port} is occupied. Set EFB_TEST_PORT to another free port.`);}catch(e){if(String(e).includes('occupied'))throw e;}
 const server=spawn(process.execPath,['local-efb/server.cjs','--port',String(port)],{cwd:root,stdio:'inherit'});
 try{
  let ready=false;
  for(let attempt=0;attempt<50;attempt++){try{const r=await fetch(base+'/__health',{signal:AbortSignal.timeout(700)});if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
  if(!ready)throw Error('Test server did not start.');
  for(const file of ['demo-tests.cjs','demo-controls-tests.cjs','demo-layout-tests.cjs'])run(process.execPath,['tests/'+file],{env:{...process.env,EFB_BASE_URL:base}});
 }finally{server.kill();}
}
try{
 if(command==='setup')run(python(),['scripts/upstreams.py']);
 else if(command==='prepare')run(python(),['scripts/prepare.py']);
 else if(command==='build'||command==='dev'){run(python(),['scripts/prepare.py']);run(process.execPath,['node_modules/vite/bin/vite.js',...(command==='build'?['build']:[]),'--config','local-efb/vite.config.mjs',...process.argv.slice(3)]);}
 else if(command==='unit'){if(!fs.existsSync('local-extensions/data/a339-reference.json'))run(python(),['scripts/prepare.py']);run(process.execPath,['tests/offline-tests.cjs']);}
 else if(command==='ui')await ui();
 else throw Error('Use setup, prepare, build, dev, unit or ui.');
}catch(e){console.error(e.message);process.exitCode=1;}
