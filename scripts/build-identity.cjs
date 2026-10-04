// One implementation shared by source preparation, the server and launcher checks.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const manifestName='a330efb-build.json';
const sourceTrees=['local-efb','local-extensions','config','scripts'];
const rootFiles=['package.json','package-lock.json','Build-EFB.ps1','Start-EFB-Demo.ps1','Stop-EFB-Demo.ps1','tsconfig.json','tsconfig.check.json'];
const excluded=new Set(['local-efb/public','local-efb/dist','local-extensions/data/a339-reference.json']);
const textExtensions=new Set(['.ts','.tsx','.js','.jsx','.cjs','.mjs','.json','.json5','.html','.css','.svg','.py','.ps1','.cmd','.md','.txt','.yml','.yaml']);
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const canonicalRoot=root=>{const actual=fs.realpathSync(root).replaceAll('\\','/');return process.platform==='win32'?actual.toLowerCase():actual;};
function sourceIdentity(root){
  const files=[];
  function walk(relative){
    if(excluded.has(relative)||relative.split('/').some(part=>['__pycache__','node_modules','.git'].includes(part)))return;
    const absolute=path.join(root,relative);if(!fs.existsSync(absolute))return;
    const stat=fs.lstatSync(absolute);
    if(stat.isSymbolicLink())throw Error('Runtime source must not be a symbolic link: '+relative);
    if(stat.isDirectory()){for(const name of fs.readdirSync(absolute).sort())walk(relative+'/'+name);}
    else if(stat.isFile()&&!relative.endsWith('.pyc'))files.push(relative);
  }
  for(const name of [...sourceTrees,...rootFiles])walk(name);
  // Additional TypeScript configurations and runtime policies participate without
  // tying the identity to Git metadata, documentation or generated build files.
  for(const name of fs.readdirSync(root))if(/^tsconfig.*\.json$/.test(name)&&!files.includes(name))walk(name);
  const digest=crypto.createHash('sha256');
  for(const relative of files.sort()){
    let bytes=fs.readFileSync(path.join(root,relative));
    if(textExtensions.has(path.extname(relative).toLowerCase()))bytes=Buffer.from(bytes.toString('utf8').replace(/^\uFEFF/,'').replaceAll('\r\n','\n'));
    digest.update(relative+'\0'+bytes.length+'\0');digest.update(bytes);digest.update('\0');
  }
  return {contentHash:digest.digest('hex'),sourceFileCount:files.length};
}
function gitIdentity(root){
  const run=args=>spawnSync('git',['-C',root,...args],{encoding:'utf8',windowsHide:true});
  const top=run(['rev-parse','--show-toplevel']);
  if(top.status!==0||!top.stdout.trim()||canonicalRoot(top.stdout.trim())!==canonicalRoot(root))return {sourceCommit:null,sourceKind:'archive',sourceDirty:null};
  const revision=run(['rev-parse','--verify','HEAD']);
  const commit=revision.status===0&&/^[a-f0-9]{40,64}$/.test(revision.stdout.trim())?revision.stdout.trim():null;
  const status=run(['status','--porcelain','--untracked-files=all','--',...sourceTrees,...rootFiles,':(glob)tsconfig*.json']);
  return {sourceCommit:commit,sourceKind:commit?'git':'uncommitted-git',sourceDirty:status.status===0?!!status.stdout.trim():null};
}
function createManifest(root){
  const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
  if(typeof version!=='string'||!version)throw Error('Missing project package version');
  const content=sourceIdentity(root),upstreams=JSON.parse(fs.readFileSync(path.join(root,'config/upstreams.json'),'utf8')).repositories.map(({name,url,commit})=>({name,url,commit}));
  return {schemaVersion:1,application:'a330efb',version,buildId:hash(version+'\0'+content.contentHash).slice(0,16),builtAt:new Date().toISOString(),...gitIdentity(root),...content,contentAlgorithm:'sha256-runtime-source-v1',upstreams};
}
function writeManifest(root){
  const manifest=createManifest(root),text=JSON.stringify(manifest,null,2)+'\n';
  for(const relative of ['local-efb/public/'+manifestName,'.artifacts/build-identity.json']){const destination=path.join(root,relative);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,text);}
  return manifest;
}
function readManifest(root){
  const file=path.join(root,'local-efb/dist',manifestName);
  if(!fs.existsSync(file))throw Error('Build identity is missing. Run Build-EFB.ps1 / npm run build.');
  const manifest=JSON.parse(fs.readFileSync(file,'utf8'));
  if(manifest.schemaVersion!==1||manifest.application!=='a330efb'||typeof manifest.version!=='string'||!manifest.version||!/^[a-f0-9]{64}$/.test(manifest.contentHash)||manifest.buildId!==hash(manifest.version+'\0'+manifest.contentHash).slice(0,16)||!Number.isFinite(Date.parse(manifest.builtAt))||!(manifest.sourceCommit===null||/^[a-f0-9]{40,64}$/.test(manifest.sourceCommit)))throw Error('Build identity is invalid. Rebuild this project.');
  return manifest;
}
function inspect(root){
  const manifest=readManifest(root),directory=canonicalRoot(root);
  return {application:'a330efb',directory,directoryId:hash(directory),build:manifest,sourceCurrent:sourceIdentity(root).contentHash===manifest.contentHash,presentation:fs.existsSync(path.join(root,'local-efb/dist/demo.html'))};
}
module.exports={manifestName,sourceIdentity,canonicalRoot,createManifest,writeManifest,readManifest,inspect};
if(require.main===module){
  try{const command=process.argv[2],root=path.resolve(process.argv[3]||path.join(__dirname,'..'));if(!['write','inspect'].includes(command))throw Error('Use build-identity.cjs write|inspect [project-root]');console.log(JSON.stringify(command==='write'?writeManifest(root):inspect(root)));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
