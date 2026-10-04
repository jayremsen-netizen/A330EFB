const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.EFB_BASE_URL||'http://127.0.0.1:19798',out='.artifacts/takeoff';
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.EFB_BROWSER_EXECUTABLE||undefined});
 const context=await browser.newContext({viewport:{width:1920,height:1080},acceptDownloads:true});
 const checks=[],errors=[],blocked=[];const p=await context.newPage();p.setDefaultTimeout(20000);
 p.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin===new URL(base).origin||['blob:','data:'].includes(u.protocol))return r.continue();blocked.push(u.href);return r.abort();});
 const shot=name=>p.screenshot({path:out+'/'+name+'.png'});
 const snapshot=()=>p.evaluate(()=>window.__TAKEOFF_ENGINEERING__.snapshot());
 async function compute(){await p.getByRole('button',{name:'保存并确认重量',exact:true}).click();await p.getByRole('button',{name:'计算工程起飞性能',exact:true}).click();await p.waitForFunction(()=>{const s=window.__TAKEOFF_ENGINEERING__?.snapshot();return s&&['engineering-feasible','engineering-infeasible','unsupported','invalid'].includes(s.status);});return snapshot();}
 async function fields(values){for(const [name,value]of Object.entries(values))await p.locator('[data-field="'+name+'"]').fill(String(value));}
 try{
  await p.goto(base);await p.waitForFunction(()=>window.__LOCAL_FLIGHT__&&window.__EFB_NAVIGATE);await p.waitForTimeout(2800);
  await p.evaluate(()=>window.__EFB_NAVIGATE('/performance/engineering-takeoff'));
  await p.locator('[data-testid="engineering-takeoff"]').waitFor();
  await shot('inputs');
  await p.getByRole('button',{name:'使用 TOGA',exact:true}).click();let s=await compute();
  assert.equal(s.status,'engineering-feasible');assert.equal(s.valid,true);
  let a=s.result.solution;assert.ok(a.v1Kt<=a.vrKt&&a.vrKt<=a.v2Kt);assert.equal(a.thrustMode,'TOGA');assert.equal(a.assumedTemperatureC,null);
  for(const k of ['asdM','todM','torM'])assert.ok(a[k]>0&&Number.isFinite(a[k]));
  assert.ok(a.margins.asdaM>=-0.1&&a.margins.todaM>=-0.1&&a.margins.toraM>=-0.1);
  await p.locator('[data-testid="engineering-result"]').scrollIntoViewIfNeeded();await shot('toga-result');checks.push('实际确认与TOGA计算输出顺序正确速度和非负距离余量');
  await p.locator('[data-testid="engineering-chart"]').scrollIntoViewIfNeeded();assert.ok(await p.locator('[data-testid="engineering-chart"] svg').count()>0);await shot('trajectory');checks.push('当前计算轨迹和声明距离图实际渲染');
  await p.getByRole('button',{name:'使用 FLEX',exact:true}).click();s=await compute();assert.equal(s.status,'engineering-feasible');
  if(s.result.solution.thrustMode==='FLEX'){assert.ok(s.result.solution.assumedTemperatureC>s.result.input.weather.oat);assert.ok(s.result.solution.thrustRatio<1);}
  await p.locator('[data-testid="engineering-result"]').scrollIntoViewIfNeeded();await shot('flex-result');checks.push('FLEX请求输出工程减推力或有依据地回退TOGA');
  let dl=p.waitForEvent('download');await p.getByRole('button',{name:'导出工程结果 JSON',exact:true}).click();await(await dl).saveAs(out+'/result.json');const saved=JSON.parse(fs.readFileSync(out+'/result.json','utf8'));assert.match(JSON.stringify(saved),/engineering|工程/);assert.ok(JSON.stringify(saved).includes('184500')||JSON.stringify(saved).includes('30000'));
  dl=p.waitForEvent('download');await p.getByRole('button',{name:'导出工程报告 HTML',exact:true}).click();await(await dl).saveAs(out+'/report.html');const html=fs.readFileSync(out+'/report.html','utf8');assert.match(html,/工程/);assert.match(html,/未.*校准|未经.*校准/);assert.match(html,/V1/);checks.push('JSON和HTML下载真实结果及模型范围');
  const reportPage=await context.newPage();await reportPage.setContent(html);await reportPage.screenshot({path:out+'/report-preview.png'});await reportPage.close();
  await p.getByRole('button',{name:'保存工程记录',exact:true}).click();
  await fields({maxFlexC:''});assert.equal(await p.getByRole('button',{name:'计算工程起飞性能',exact:true}).isDisabled(),true);assert.equal((await snapshot()).valid,false);await fields({maxFlexC:70});await compute();checks.push('空FLEX上限不能计算且不延用旧结果');
  await fields({tora:1000,toda:1000,asda:1000});await p.waitForFunction(()=>window.__TAKEOFF_ENGINEERING__.snapshot().status==='stale');assert.equal((await snapshot()).valid,false);assert.equal(await p.locator('[data-testid="engineering-chart"]').count(),0);assert.equal(await p.getByRole('button',{name:'导出工程报告 HTML',exact:true}).isDisabled(),true);checks.push('改变跑道输入立即撤下旧数值曲线并禁用旧报告');
  s=await compute();assert.equal(s.status,'engineering-infeasible');assert.equal(s.valid,false);assert.equal(s.result.solution,null);await p.locator('[data-testid="engineering-result"]').scrollIntoViewIfNeeded();await shot('short-runway');checks.push('短跑道返回不可行诊断并不提供可采用速度');
  await p.locator('.engineering-history summary').click();await p.getByRole('button',{name:'恢复工程输入（需重算）',exact:true}).first().click();assert.equal(await p.locator('[data-field="tora"]').inputValue(),'3500');assert.equal((await snapshot()).valid,false);assert.equal(await p.evaluate(()=>!!window.__LOCAL_FLIGHT__.getState().confirmed),false);checks.push('工程会话历史恢复输入但不恢复确认或旧有效结果');
  s=await compute();assert.equal(s.valid,true);checks.push('恢复跑道条件后经确认重算恢复有效结果');
  await p.getByLabel('跑道条件',{exact:true}).selectOption('wet');s=await compute();assert.equal(s.status,'unsupported');assert.equal(s.result.solution,null);checks.push('湿跑道明确拒绝且清除上次可行结果');
  await p.getByLabel('跑道条件',{exact:true}).selectOption('dry');await compute();
  await fields({windKt:10,windDir:190});s=await compute();assert.equal(s.result.environment.headwindKt,-10);checks.push('手工顺风输入进入当前环境计算');
  await fields({windKt:0,windDir:10});await compute();
  await p.evaluate(()=>window.dispatchEvent(new Event('local-ground-change')));assert.equal((await snapshot()).valid,false);assert.equal(await p.locator('[data-testid="engineering-chart"]').count(),0);await compute();checks.push('地面目标变化撤销工程结果并要求重新确认');
  await p.setViewportSize({width:1280,height:720});await p.locator('[data-testid="engineering-chart"]').scrollIntoViewIfNeeded();await shot('layout-1280');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);checks.push('1280×720工程结果页面可访问且无整页横向溢出');
  await p.reload();await p.waitForFunction(()=>window.__LOCAL_FLIGHT__&&window.__EFB_NAVIGATE);await p.waitForTimeout(2800);await p.evaluate(()=>window.__EFB_NAVIGATE('/performance/engineering-takeoff'));await p.locator('[data-testid="engineering-takeoff"]').waitFor();assert.equal((await snapshot()).valid,false);assert.equal(await p.locator('[data-testid="engineering-chart"]').count(),0);checks.push('刷新后保留航班但不把会话工程结果恢复为有效');
  assert.deepEqual(errors,[]);checks.push('阻断外网仍完成全部操作且无脚本错误');
  fs.writeFileSync(out+'/ui-tests.json',JSON.stringify({at:new Date().toISOString(),status:'PASS',checks,errors,blockedExternalRequests:[...new Set(blocked)]},null,2));console.log('PASS takeoff UI',checks.length);
 }catch(e){await shot('failure').catch(()=>{});fs.writeFileSync(out+'/failure.json',JSON.stringify({error:String(e),errors,state:await snapshot().catch(()=>null),body:await p.locator('body').innerText().catch(()=>null)},null,2));throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
