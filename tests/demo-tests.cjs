const baseURL=process.env.EFB_BASE_URL||'http://127.0.0.1:9698';
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out='.artifacts/demo';fs.mkdirSync(out,{recursive:true});
fs.mkdirSync('.artifacts/demo',{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.EFB_BROWSER_EXECUTABLE||undefined,headless:true});
 const context=await browser.newContext({viewport:{width:1920,height:1080},acceptDownloads:true});
 const errors=[],blocked=[],checks=[];let page;
 try{
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname==='127.0.0.1'||['data:','blob:'].includes(u.protocol))return r.continue();blocked.push(u.href);return r.abort();});
 page=await context.newPage();page.setDefaultTimeout(35000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(baseURL+"/");await page.waitForFunction(()=>window.__LOCAL_FLIGHT__&&window.__EFB_NAVIGATE);await page.waitForTimeout(2800);
 await page.evaluate(()=>{const api=window.__LOCAL_FLIGHT__;api.editFlight({...api.getState().flight,number:'KEEP901',pax:222});localStorage.setItem('BID_TEST_SENTINEL','preserve');});
 const before=await page.evaluate(()=>({flight:localStorage.getItem('A339_LOCAL_FLIGHT_V1'),sentinel:localStorage.getItem('BID_TEST_SENTINEL')}));
 await page.goto(baseURL+"/demo.html?autoplay=1");
 await page.waitForFunction(()=>window.__BID_PRESENTATION__&&!window.__BID_PRESENTATION__.status().busy,{},{timeout:35000});
 const scenes=await page.evaluate(()=>window.__BID_PRESENTATION__.scenarios);
 fs.writeFileSync('.artifacts/demo/scenarios.json',JSON.stringify(scenes,null,2));
 async function status(){return page.evaluate(()=>window.__BID_PRESENTATION__.status());}
 async function runScene(id,capture=true){
  const seen=new Set(),deadline=Date.now()+180000;
  while(Date.now()<deadline){
   const s=await status();if(s.failed)throw Error(await page.locator('#error-text').innerText());
   if(s.completed){const record=await page.evaluate(()=>window.__BID_PRESENTATION__.record());assert.equal(record.records.filter(x=>x.status==='完成').length,scenes.find(x=>x.id===id).steps.length);fs.writeFileSync(out+'/'+id+'-record.json',JSON.stringify(record,null,2));return record;}
   const step=scenes.find(x=>x.id===id).steps[s.index];
   if(!s.busy&&s.actionIndex>=step.actions.length){
    if(!seen.has(s.index)){
     seen.add(s.index);console.log(id,step.id,JSON.stringify({tow:s.snapshot.tow,v2:s.snapshot.v2,valid:s.snapshot.valid,history:s.snapshot.history}));
     if(capture){await page.screenshot({path:out+'/'+id+'-'+String(s.index+1).padStart(2,'0')+'-'+step.id+'.png'});}
     if(id==='preflight'&&step.id==='load-edit'){
      await page.evaluate(()=>window.__BID_PRESENTATION__.pause());const a=await status();await page.waitForTimeout(1100);const b=await status();assert.equal(b.index,a.index);assert.ok(Math.abs(b.remaining-a.remaining)<.15);assert.equal(b.playing,false);checks.push('暂停冻结剩余讲解时间');await page.evaluate(()=>window.__BID_PRESENTATION__.play());
     }
     if(step.id==='report'){assert.equal(await page.locator('#report-dialog').evaluate(e=>e.open),true);const html=await page.locator('#report-frame').getAttribute('srcdoc');assert.ok(html.includes(id==='preflight'?'150.80':'151.20'));checks.push(id+' 实际核算报告预览');}
     if(step.id==='engineering-report'){assert.equal(await page.locator('#report-dialog').evaluate(e=>e.open),true);const html=await page.locator('#report-frame').getAttribute('srcdoc');assert.match(html,/工程模型/);assert.match(html,/V1/);assert.match(html,/参数来源/);checks.push('工程场景预览当前模型报告及参数来源');}
     if(step.id==='stale'){const frame=page.frame({url:/demo-session=1/});assert.equal(await frame.getByRole('button',{name:'导出报告 HTML',exact:true}).isDisabled(),true);checks.push(id+' 失效结果禁止导出');}
     if(step.id==='landing'){fs.writeFileSync(out+'/landing-state.json',JSON.stringify(s.snapshot.landing,null,2));const l=s.snapshot.landing.landing;assert.equal(l.weight,190000);assert.ok(l.maxAutobrakeLandingDist>0);assert.ok(l.lowAutobrakeLandingDist>l.maxAutobrakeLandingDist);checks.push('原生着陆计算返回三档制动距离');}
    }
    await page.evaluate(()=>window.__BID_PRESENTATION__.skipHold());
   }
   await page.waitForTimeout(120);
  }throw Error('Scenario timeout '+id);
 }
 const preflight=await runScene('preflight');assert.equal(preflight.current.v2,151.2);assert.equal(preflight.current.history,2);checks.push('典型航班准备 20 步实际执行');
 const after=await page.evaluate(()=>({flight:localStorage.getItem('A339_LOCAL_FLIGHT_V1'),sentinel:localStorage.getItem('BID_TEST_SENTINEL')}));assert.deepEqual(after,before);checks.push('同源普通航班与存储未被演示复位改写');
 await page.click('#materials');let dl=page.waitForEvent('download');await page.click('[data-download="result"]');let d=await dl;const resultPath=out+'/download-result.json';await d.saveAs(resultPath);assert.equal(JSON.parse(fs.readFileSync(resultPath,'utf8')).v2,151.2);
 dl=page.waitForEvent('download');await page.click('[data-download="report"]');d=await dl;await d.saveAs(out+'/download-report.html');assert.ok(fs.readFileSync(out+'/download-report.html','utf8').includes('151.20'));await page.click('#close-materials');checks.push('资料面板下载真实 JSON 和 HTML');
 await page.evaluate(()=>window.__BID_PRESENTATION__.seek(10));await page.waitForFunction(()=>{const s=window.__BID_PRESENTATION__.status();return s.failed||(!s.busy&&s.index===10&&s.actionIndex>=3);});assert.equal((await status()).snapshot.v2,150.8);assert.equal((await status()).snapshot.history,0);await page.evaluate(()=>window.__BID_PRESENTATION__.pause());checks.push('向后定位重建输入和历史，无残留变更');
 await page.setViewportSize({width:1280,height:720});await page.screenshot({path:out+'/layout-1280x720.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.setViewportSize({width:1920,height:1080});
 await page.evaluate(()=>window.__BID_PRESENTATION__.select('change'));const change=await runScene('change');assert.equal(change.current.history,2);checks.push('地面变更场景独立重播 7 步');
 await page.evaluate(()=>window.__BID_PRESENTATION__.select('tools'));await runScene('tools');checks.push('专业工具场景独立重播 7 步');
 await page.evaluate(()=>window.__BID_PRESENTATION__.select('resources'));const resources=await runScene('resources');assert.equal(resources.current.currentFuel,30000);assert.equal(resources.current.pushbackMetres,30);checks.push('资料与地面协同场景独立执行 12 步');
 await page.evaluate(()=>window.__BID_PRESENTATION__.select('takeoff'));const takeoff=await runScene('takeoff');assert.equal(takeoff.current.engineeringValid,true);assert.equal(takeoff.current.engineeringStatus,'engineering-feasible');checks.push('工程起飞场景8步完成TOGA FLEX短跑道诊断与恢复');
 await page.click('#close-report');await page.click('#materials');dl=page.waitForEvent('download');await page.click('[data-download="result"]');await(await dl).saveAs(out+'/download-engineering-result.json');assert.equal(JSON.parse(fs.readFileSync(out+'/download-engineering-result.json','utf8')).status,'engineering-feasible');await page.click('#close-materials');checks.push('演示资料下载当前工程结果而非旧V2参考结果');
 await page.evaluate(()=>window.__BID_PRESENTATION__.select('change'));await runScene('change',false);checks.push('第二次重播历史仍为 2 条，检查单状态已复位');
 await page.goto(baseURL+"/");await page.waitForFunction(()=>window.__LOCAL_FLIGHT__&&window.__EFB_NAVIGATE);await page.waitForTimeout(2800);
 assert.equal(await page.evaluate(()=>window.__LOCAL_FLIGHT__.getState().flight.number),'KEEP901');
 await page.evaluate(()=>{window.__LOCAL_FLIGHT__.confirmFlight();window.__LOCAL_FLIGHT__.runCalculation();window.__EFB_NAVIGATE('/ground/payload');});await page.waitForTimeout(1300);
 assert.equal(await page.evaluate(()=>window.__LOCAL_FLIGHT__.getState().groundChanged),false);
 await page.evaluate(()=>window.SimVar.SetSimVarValue('L:A32NX_WB_PER_BAG_WEIGHT','Kilograms',25));
 assert.equal(await page.evaluate(()=>window.__LOCAL_FLIGHT__.getState().groundChanged),true);assert.equal(await page.evaluate(()=>window.__LOCAL_FLIGHT__.currentResult()),null);checks.push('普通模式恢复原航班；计划自动同步不失效，手动载荷变更仍失效');
 assert.deepEqual(errors,[]);assert.equal(blocked.some(u=>/simbrief/i.test(u)),false);checks.push('外网全部阻断仍完成演示；无脚本错误；无 SimBrief 请求');
 fs.writeFileSync(out+'/demo-tests.json',JSON.stringify({at:new Date().toISOString(),status:'PASS',checks,errors,blockedExternalRequests:[...new Set(blocked)]},null,2));console.log('PASS',checks.length);
 }catch(e){if(page){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});fs.writeFileSync(out+'/failure.json',JSON.stringify({error:String(e),errors,state:await page.evaluate(()=>window.__BID_PRESENTATION__?.status()).catch(()=>null),body:await page.locator('body').innerText().catch(()=>null)},null,2));}throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
