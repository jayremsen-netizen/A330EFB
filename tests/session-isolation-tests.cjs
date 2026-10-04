const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.EFB_BASE_URL||'http://127.0.0.1:19798',out='.artifacts/session-isolation';
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.EFB_BROWSER_EXECUTABLE||undefined});
 const context=await browser.newContext({viewport:{width:1600,height:1100}}),checks=[],errors=[];
 context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 await context.route('**/*',route=>{const u=new URL(route.request().url());return u.origin===new URL(base).origin||['blob:','data:'].includes(u.protocol)?route.continue():route.abort();});
 const ready=async p=>{await p.waitForFunction(()=>window.__LOCAL_FLIGHT__&&window.__EFB_NAVIGATE);await p.waitForTimeout(2800);};
 const confirm=async(p,number)=>{await p.evaluate(()=>window.__EFB_NAVIGATE('/dispatch/local-flight'));await p.locator('[data-field="number"]').fill(number);await p.getByRole('button',{name:'保存并确认重量',exact:true}).click();assert.ok(await p.evaluate(()=>window.__LOCAL_FLIGHT__.getState().confirmed));};
 const state=async p=>p.evaluate(()=>{const s=window.__LOCAL_FLIGHT__.getState();return {number:s.flight.number,confirmed:s.confirmed,conflict:s.storageConflict};});
 const demo=async()=>{const p=await context.newPage();await p.goto(base+'/demo.html');await p.waitForFunction(()=>window.__BID_PRESENTATION__&&!window.__BID_PRESENTATION__.status().busy);const f=p.frame({url:/demo-session=1/});await ready(f);return {p,f};};
 let active;
 try{
  const normal=await context.newPage();active=normal;await normal.goto(base);await ready(normal);await confirm(normal,'NORMAL01');const normalBefore=await state(normal);
  const first=await demo();active=first.p;await confirm(first.f,'FIRST01');const firstBefore=await state(first.f),firstSession=new URL(first.f.url()).searchParams.get('session');
  const second=await demo();active=second.p;await confirm(second.f,'SECOND02');const secondSession=new URL(second.f.url()).searchParams.get('session');
  assert.notEqual(firstSession,secondSession);assert.deepEqual(await state(first.f),firstBefore);assert.deepEqual(await state(normal),normalBefore);checks.push('两个实际演示控制台及普通航班使用独立存储，第二窗口启动不撤销第一窗口确认');
  const secondPrefix='A339_BID_DEMO:'+secondSession+':';await second.p.locator('#restart').click();await second.p.waitForFunction(old=>{const frame=document.querySelector('iframe#efb')||document.querySelector('iframe');return window.__BID_PRESENTATION__&&!window.__BID_PRESENTATION__.status().busy&&!frame.src.includes('session='+old);},secondSession);
  await second.p.evaluate(()=>window.__BID_PRESENTATION__.pause());assert.deepEqual(await state(first.f),firstBefore);assert.deepEqual(await state(normal),normalBefore);assert.equal(await second.p.evaluate(prefix=>Object.keys(localStorage).some(k=>k.startsWith(prefix)),secondPrefix),false);checks.push('重播只清理本控制台旧会话，第一窗口及普通航班内容不变');
  second.f=second.p.frame({url:/demo-session=1/});await ready(second.f);await confirm(second.f,'SECOND03');const secondBefore=await state(second.f);
  await first.p.locator('#restart').click();await first.p.waitForFunction(()=>window.__BID_PRESENTATION__&&!window.__BID_PRESENTATION__.status().busy);await first.p.evaluate(()=>window.__BID_PRESENTATION__.pause());assert.deepEqual(await state(second.f),secondBefore);checks.push('第一窗口重播也不干扰第二窗口，隔离双向成立');
  const a=await context.newPage(),b=await context.newPage();await a.goto(base+'/?demo-session=1&reset=1');await ready(a);await confirm(a,'DIRECT01');const before=await state(a);await b.goto(base+'/?demo-session=1&reset=1&session=bad%3A');await ready(b);
  const sa=new URL(a.url()).searchParams.get('session'),sb=new URL(b.url()).searchParams.get('session');assert.match(sa,/^[a-zA-Z0-9_-]+$/);assert.match(sb,/^[a-zA-Z0-9_-]+$/);assert.notEqual(sa,sb);assert.deepEqual(await state(a),before);checks.push('直接打开缺失或非法session的演示地址会生成独立身份，不清其他窗口');
  assert.deepEqual(errors,[]);checks.push('以上操作在外网阻断下无脚本错误');
  fs.writeFileSync(out+'/results.json',JSON.stringify({at:new Date().toISOString(),status:'PASS',checks,errors},null,2));console.log('PASS session isolation',checks.length);
 }catch(e){await active?.screenshot({path:out+'/failure.png'}).catch(()=>{});fs.writeFileSync(out+'/failure.json',JSON.stringify({error:String(e),errors,checks},null,2));throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
