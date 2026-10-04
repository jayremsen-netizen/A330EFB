const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.EFB_BASE_URL||'http://127.0.0.1:19798',out='.artifacts/review-regression';
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.EFB_BROWSER_EXECUTABLE||undefined});
 const c=await browser.newContext({viewport:{width:1600,height:1100}}),p=await c.newPage(),checks=[],errors=[],external=[];
 p.on('pageerror',e=>errors.push(e.message));
 await c.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin===new URL(base).origin||['blob:','data:'].includes(u.protocol))return r.continue();external.push(u.href);return r.abort();});
 await c.addInitScript(()=>{localStorage.setItem('A339X_GSX_PAYLOAD_SYNC','1');localStorage.setItem('A339X_GSX_FUEL_SYNC','1');localStorage.setItem('A339X_GSX_POWER_SYNC','1');localStorage.setItem('A339X_CONFIG_SIMBRIDGE_ENABLED','AUTO ON');localStorage.setItem('A339X_CONFIG_AUTO_SIMBRIEF_IMPORT','ENABLED');localStorage.setItem('A339X_NAVIGRAPH_ACCESS_TOKEN','review-test-only-not-a-token');localStorage.setItem('A339X_NAVIGRAPH_REFRESH_TOKEN','review-test-only-not-a-token');});
 const nav=async route=>{await p.evaluate(r=>window.__EFB_NAVIGATE(r),route);await p.waitForTimeout(220);};
 const landing=()=>p.evaluate(()=>window.__EFB_STORE__.getState().performance.landing);
 async function noLanding(){await p.waitForFunction(()=>{const s=window.__EFB_STORE__.getState().performance.landing;return !s.maxAutobrakeLandingDist&&!s.mediumAutobrakeLandingDist&&!s.lowAutobrakeLandingDist&&!s.runwayVisualizationLabels.length;});assert.equal(await p.locator('svg').filter({hasText:/(?:MAX|MED|LOW)\s+\d/}).count(),0);}
 async function inputs(){const vals=[null,'170','3500','0','0','0','15','1013.25','190000','145'];const fields=p.locator('input:visible');for(let i=1;i<vals.length;i++){await fields.nth(i).fill(vals[i]);await fields.nth(i).press('Tab');}}
 async function compute(){await p.getByRole('button',{name:'计算',exact:true}).click();assert.ok((await landing()).maxAutobrakeLandingDist>0);}
 try{
  await p.goto(base);await p.waitForFunction(()=>window.__EFB_STORE__&&window.__LOCAL_FLIGHT__&&window.__EFB_NAVIGATE);await p.waitForTimeout(2800);await p.evaluate(()=>window.__LOCAL_FLIGHT__.confirmFlight());
  await nav('/performance/landing');await inputs();await compute();
  await p.locator('input:visible').nth(8).fill('180000');await noLanding();checks.push('R01 重量修改后未点击计算即撤下全部旧着陆数字和 SVG 标签');
  await inputs();await compute();await p.locator('input:visible').nth(8).fill('');await noLanding();checks.push('R01 清空重量立即失效，不能保留旧结果');
  await inputs();await compute();await p.getByText('kg',{exact:true}).click();await p.getByText('lb',{exact:true}).click();await noLanding();await p.getByText('lb',{exact:true}).click();await p.getByText('kg',{exact:true}).click();checks.push('R01 显示单位切换撤销旧结果');
  await inputs();await compute();await p.locator('button:has(svg.bi-cloud-arrow-down)').click();await noLanding();checks.push('R01 采用 OFP 前立即失效，资料读取失败也不恢复旧结果');
  // The reducer also covers asynchronous updates and writers outside the mounted widget.
  for(const patch of [{windMagnitude:7},{temperature:21,pressure:1007},{weight:undefined},{flaps:0},{reverseThrust:true},{autoland:true}]){
   await inputs();await compute();await p.evaluate(value=>window.__EFB_STORE__.dispatch({type:'performance/setLandingValues',payload:value}),patch);await noLanding();
  }
  checks.push('R01 天气、空值、构型及自动着陆批量采用在状态入口统一失效');
  await p.screenshot({path:out+'/landing-invalidated.png'});
  await nav('/settings');await p.locator('[data-testid="local-capabilities"]').waitFor();assert.equal(await p.locator('a[href="/performance/engineering-takeoff"]').count(),1);assert.match(await p.locator('body').innerText(),/Headwind.*FlyByWire/s);
  await p.getByLabel('本地界面主题').selectOption('blue');assert.ok(await p.evaluate(()=>document.documentElement.classList.contains('theme-blue')));await p.getByLabel('本地界面主题').selectOption('orange');checks.push('R07 功能入口与主题设置有效，开源署名保留');await p.screenshot({path:out+'/capabilities.png'});
  for(const route of ['/settings/3rd-party-options','/settings/sim-options','/settings/atsu-aoc','/settings/realism','/settings/aircraft-options-pin-programs','/navigation/navigraph','/atc']){
   await nav(route);await p.locator('[data-testid="unavailable-capability"]').waitFor();assert.equal(await p.locator('[data-testid="unavailable-capability"] input,[data-testid="unavailable-capability"] button,[data-testid="unavailable-capability"] select').count(),0);
  }
  checks.push('R07 未接入的设置、外部航图和 ATC 路由无登录或可操作开关');
  await p.locator('svg.bi-gear').first().click();await p.locator('[data-testid="local-quick-controls"]').waitFor();assert.doesNotMatch(await p.locator('[data-testid="local-quick-controls"]').innerText(),/SimBridge|ADIRS|GSX/);await p.getByRole('button',{name:'关闭面板',exact:true}).click();checks.push('R07 全局快捷面板保留设置和电源操作，不提供模拟器控制');
  const policy=await p.evaluate(()=>Object.fromEntries(['GSX_PAYLOAD_SYNC','GSX_FUEL_SYNC','GSX_POWER_SYNC','CONFIG_SIMBRIDGE_ENABLED','CONFIG_AUTO_SIMBRIEF_IMPORT'].map(k=>[k,window.GetStoredData('A339X_'+k)])));
  assert.deepEqual(policy,{GSX_PAYLOAD_SYNC:'0',GSX_FUEL_SYNC:'0',GSX_POWER_SYNC:'0',CONFIG_SIMBRIDGE_ENABLED:'PERM OFF',CONFIG_AUTO_SIMBRIEF_IMPORT:'DISABLED'});
  assert.deepEqual(await p.evaluate(()=>['NAVIGRAPH_ACCESS_TOKEN','NAVIGRAPH_REFRESH_TOKEN'].map(k=>window.GetStoredData('A339X_'+k))),['','']);
  await nav('/ground/payload');assert.doesNotMatch(await p.locator('body').innerText(),/GSX.*已启用|GSX.*enabled/i);await p.evaluate(()=>{window.__LOCAL_RUNTIME__.preset('parked');window.__LOCAL_RUNTIME__.command('board');});await p.waitForFunction(()=>window.__LOCAL_RUNTIME__.snapshot().pax===250);checks.push('R07 旧 GSX 与外部同步偏好被隔离，本地登机仍完成');
  assert.deepEqual(errors,[]);assert.equal(external.some(u=>/simbrief|navigraph|vatsim|ivao/i.test(u)),false);checks.push('R07 核心路径没有触发外部集成请求');
  fs.writeFileSync(out+'/ui-tests.json',JSON.stringify({status:'PASS',at:new Date().toISOString(),checks,errors,blockedExternalRequests:external},null,2));console.log('Review UI PASS',checks.length);
 }catch(error){await p.screenshot({path:out+'/failure.png'}).catch(()=>{});fs.writeFileSync(out+'/failure.json',JSON.stringify({error:String(error),checks,errors,body:await p.locator('body').innerText().catch(()=>null)},null,2));throw error;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
