const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),esbuild=require('esbuild');
fs.mkdirSync('.artifacts/landing',{recursive:true});
const target=path.resolve('.artifacts/landing/engine.cjs');
esbuild.buildSync({entryPoints:['local-extensions/landing/index.ts'],bundle:true,platform:'node',format:'cjs',outfile:target});
const {calculateLanding:calculate,defaultLandingInput,landingParameters:P,landingSignature,landingChartSvg,landingReportHtml}=require(target);
const cases=[];
function test(name,fn){try{fn();cases.push({name,status:'PASS'});}catch(error){cases.push({name,status:'FAIL',error:String(error)});}}
function base(){return defaultLandingInput('ZSPD');}
function context(){return {flight:{id:'LANDING-TEST',number:'DEMO330',date:'2026-10-04',to:'ZSPD',alternate:'ZSSS'},massSource:'test workflow',massSignature:'mass-v1',workflowSignature:'workflow-v1'};}
function good(input=base(),mass=170000){const result=calculate(input,mass,context());assert.equal(result.status,'engineering-feasible',JSON.stringify(result.errors));assert.ok(result.solution);return result;}
function near(actual,expected,tolerance=1e-7){assert.ok(Math.abs(actual-expected)<tolerance,actual+' vs '+expected);}

test('目的地独立条件产生可追溯工程着陆距离并与LDA比较',()=>{
 const input=base(),result=good(input);
 assert.equal(result.input.airport,'ZSPD');assert.equal(result.input.weather.station,'ZSPD');
 assert.match(result.label,/工程模型/);assert.equal(result.model.provenance.status,'assumed-engineering-configuration');
 const s=result.solution;near(s.airDistanceM+s.delayDistanceM+s.brakingDistanceM,s.unfactoredDistanceM);
 near(s.unfactoredDistanceM*input.distanceFactor,s.requiredDistanceM);near(s.marginM,input.runway.ldaM-s.requiredDistanceM);
 assert.ok(s.vappKt>s.vrefKt&&s.marginM>0);assert.equal(result.context.massSignature,'mass-v1');
});

test('机场或天气站与独立目的地不一致时拒绝计算和速度输出',()=>{
 for(const change of [i=>i.airport='ZUTF',i=>i.weather.station='ZUTF',i=>i.target='alternate']){
  const input=base();change(input);const r=calculate(input,170000,context());assert.equal(r.status,'invalid');assert.equal(r.solution,null);assert.ok(r.errors.length);
 }
});
test('空值、非有限数、错误枚举和单位范围拒绝而不抛异常',()=>{
 for(const change of [i=>i.weather.oatC=NaN,i=>i.runway.ldaM=Infinity,i=>i.weather.windKt=-1,i=>i.weather.windDirDeg=361,i=>i.weather.qnhHpa=700,i=>i.weather.gustKt=-1,i=>i.distanceFactor=1,i=>i.configuration='CLEAN',i=>i.reversers=3,i=>i.autobrake='RTO']){
  const input=base();change(input);const r=calculate(input,170000,context());assert.equal(r.status,'invalid');assert.equal(r.solution,null);assert.equal(r.environment,null);
 }
 for(const input of [null,{},[],{runway:null,weather:null}])assert.equal(calculate(input,170000,context()).status,'invalid');
 for(const mass of [NaN,Infinity,-1,null])assert.equal(calculate(base(),mass,context()).status,'invalid');
 assert.equal(calculate(base(),170000,null).status,'invalid');
});
test('污染跑道与工程包线越界输出unsupported且不泄漏可用速度',()=>{
 for(const change of [i=>i.runway.condition='contaminated',i=>i.runway.elevationFt=9000,i=>i.runway.slopePercent=2.01,i=>i.runway.ldaM=7000,i=>i.weather.oatC=46,i=>{i.weather.windKt=11;i.weather.gustKt=11;i.weather.windDirDeg=190;},i=>{i.weather.windKt=26;i.weather.gustKt=26;i.weather.windDirDeg=100;},i=>i.weather.gustKt=31]){
  const input=base();change(input);const r=calculate(input,170000,context());assert.equal(r.status,'unsupported',JSON.stringify(input));assert.equal(r.solution,null);assert.ok(r.errors.length);
 }
 for(const mass of [119999,191001]){const r=calculate(base(),mass,context());assert.equal(r.status,'unsupported');assert.equal(r.solution,null);}
});
test('短跑道显示不足距离并按100kg保守搜索场长限重',()=>{
 const input=base();input.runway.ldaM=1800;
 const result=calculate(input,191000,context());assert.equal(result.status,'engineering-infeasible');assert.ok(result.solution.marginM<0);
 const limit=result.diagnostics.fieldLimitKg;assert.ok(limit>=120000&&limit<191000);assert.equal(limit%100,0);
 assert.equal(calculate(input,limit,context()).status,'engineering-feasible');assert.equal(calculate(input,limit+100,context()).status,'engineering-infeasible');
 const impossible=base();impossible.runway.ldaM=300;const r=calculate(impossible,170000,context());assert.equal(r.diagnostics.fieldLimitKg,null);assert.match(r.diagnostics.limitReason,/最低/);
 assert.equal(good().diagnostics.fieldLimitKg,P.airframe.modelMaxKg);
});
test('独立解析：海平面 Vref 满足升力平衡与公开假设倍率',()=>{
 const r=good(),v=r.solution.vrefKt*P.constants.ktToMs/P.approach.vrefToStall;
 near(0.5*r.environment.densityKgM3*v*v*P.airframe.wingAreaM2*P.configurations.FULL.clMax,170000*P.constants.gravity,0.1);
});
test('独立解析：干跑道MED总减速度未受摩擦限制时刹车距离符合 v²/(2a)',()=>{
 const s=good().solution,gs=s.touchdownGroundSpeedKt*P.constants.ktToMs;
 near(s.brakingDistanceM,gs*gs/(2*P.ground.autobrakeDecelerationMs2.MED),1e-6);
 near(s.delayDistanceM,gs*P.ground.delaySeconds,1e-6);
});
test('同一条件增重增加速度和工程所需距离',()=>{
 const light=good(base(),150000).solution,heavy=good(base(),185000).solution;
 assert.ok(heavy.vrefKt>light.vrefKt);assert.ok(heavy.requiredDistanceM>light.requiredDistanceM);
});
test('湿跑道减弱制动且不会产生比干跑道更短的距离',()=>{
 const dry=base(),wet=base();wet.runway.condition='wet';
 const a=good(dry).solution,b=good(wet).solution;near(a.airDistanceM,b.airDistanceM);assert.ok(b.brakingDistanceM>a.brakingDistanceM);assert.ok(b.requiredDistanceM>a.requiredDistanceM);
});
test('反推在摩擦受限湿跑道改善距离，干跑道MED保持总减速度目标',()=>{
 const dry=base(),dryNo=base(),wet=base(),wetNo=base();dryNo.reversers=0;wet.runway.condition=wetNo.runway.condition='wet';wetNo.reversers=0;
 near(good(dry).solution.brakingDistanceM,good(dryNo).solution.brakingDistanceM,1e-6);
 assert.ok(good(wet).solution.brakingDistanceM<good(wetNo).solution.brakingDistanceM);
});
test('LOW/MED/MAX依次缩短滑跑且不能无限超过路面摩擦上限',()=>{
 const inputs=['LOW','MED','MAX'].map(autobrake=>({...base(),autobrake}));const distances=inputs.map(i=>good(i).solution.brakingDistanceM);
 assert.ok(distances[0]>distances[1]&&distances[1]>distances[2]);assert.ok(distances[2]>0);
});
test('高温与高压力高度增加地速相关距离而非复用海平面距离',()=>{
 const sea=good().solution,hot=base(),high=base();hot.weather.oatC=40;high.runway.elevationFt=5000;
 assert.ok(good(hot).solution.requiredDistanceM>sea.requiredDistanceM);assert.ok(good(high).solution.requiredDistanceM>sea.requiredDistanceM);
});
test('迎风减小距离、顺风增大距离，风向正负符号正确',()=>{
 const still=good().solution,head=base(),tail=base();head.weather.windKt=head.weather.gustKt=10;tail.weather.windKt=tail.weather.gustKt=10;tail.weather.windDirDeg=190;
 const h=good(head),t=good(tail);near(h.environment.headwindKt,10);near(t.environment.headwindKt,-10);
 assert.ok(h.solution.requiredDistanceM<still.requiredDistanceM);assert.ok(t.solution.requiredDistanceM>still.requiredDistanceM);
});
test('摩擦受限时下坡加长、上坡缩短滑跑',()=>{
 const down=base(),level=base(),up=base();for(const i of [down,level,up]){i.autobrake='MAX';i.runway.condition='wet';}down.runway.slopePercent=-2;up.runway.slopePercent=2;
 assert.ok(good(down).solution.brakingDistanceM>good(level).solution.brakingDistanceM);assert.ok(good(up).solution.brakingDistanceM<good(level).solution.brakingDistanceM);
});
test('CONF3、额外进近速度、阵风增量各自进入计算',()=>{
 const baseline=good(),conf=base(),add=base(),gust=base();conf.configuration='CONF3';add.approachAdditiveKt=10;gust.weather.gustKt=15;
 assert.ok(good(conf).solution.vrefKt>baseline.solution.vrefKt);assert.ok(good(add).solution.requiredDistanceM>baseline.solution.requiredDistanceM);
 assert.equal(good(gust).solution.additiveKt,15);assert.ok(good(gust).solution.vappKt>baseline.solution.vappKt);
});
test('LDA只改变余量和限重，不改变指定重量的物理距离',()=>{
 const input=base();input.runway.ldaM+=1000;const a=good().solution,b=good(input).solution;
 near(a.requiredDistanceM,b.requiredDistanceM);near(b.marginM-a.marginM,1000);
});
test('距离系数只应用一次，不改变速度或未乘系数距离',()=>{
 const input=base();input.distanceFactor=1.3;const a=good().solution,b=good(input).solution;
 near(a.vappKt,b.vappKt);near(a.unfactoredDistanceM,b.unfactoredDistanceM);near(b.requiredDistanceM/a.requiredDistanceM,1.3/1.15);
});
for(const altitude of [-1000,8000])test('压力高度精确边界可算，0.001ft越界被拒绝 '+altitude,()=>{
 const input=base();input.runway.elevationFt=altitude;input.runway.ldaM=6000;const r=good(input);near(r.environment.pressureAltitudeFt,altitude,1e-6);
 input.runway.elevationFt+=altitude<0?-0.001:0.001;assert.equal(calculate(input,170000,context()).status,'unsupported');
});
test('备降场使用独立机场与条件，不引用目的地或起飞机场',()=>{
 const input=defaultLandingInput('ZSSS','alternate'),result=good(input);assert.equal(result.input.airport,'ZSSS');assert.equal(result.input.weather.station,'ZSSS');assert.match(result.input.weather.source,/非观测报文/);
 const changed=context();changed.flight.alternate='ZSNJ';assert.equal(calculate(input,170000,changed).status,'invalid');
});
test('数值轨迹距离和时间单调、最终停车、各段累计正确',()=>{
 const s=good().solution,points=s.trajectory,last=points.at(-1);near(points[0].heightM,15.24);near(last.distanceM,s.unfactoredDistanceM);near(last.groundSpeedKt,0);near(last.timeS,s.stopTimeS);
 const braking=points.find(p=>p.phase==='braking');near(braking.distanceM,s.airDistanceM+s.delayDistanceM);
 for(let j=1;j<points.length;j++){assert.ok(points[j].distanceM>=points[j-1].distanceM);assert.ok(points[j].timeS>=points[j-1].timeS);assert.ok(points[j].heightM<=points[j-1].heightM);}
 assert.ok(points.length<=100);
});
test('快照不修改输入，重量/工作流签名变化使旧结果键失效',()=>{
 const input=base(),c=context(),before=JSON.stringify({input,c}),r=calculate(input,170000,c);assert.equal(JSON.stringify({input,c}),before);assert.notEqual(r.input,input);
 assert.equal(r.signature,landingSignature(input,170000,c));assert.notEqual(r.signature,landingSignature(input,170001,c));c.workflowSignature='workflow-v2';assert.notEqual(r.signature,landingSignature(input,170000,c));
 input.weather.oatC=30;assert.equal(r.input.weather.oatC,15);assert.ok(r.model.signature.includes('reverseForcePerEngineN'));
});
test('报告包含来源版本快照，SVG为计算数值且用户文本被转义',()=>{
 const c=context();c.massSource='<img src=x onerror=alert(1)>';const r=calculate(base(),170000,c),html=landingReportHtml(r),svg=landingChartSvg(r);
 assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));assert.ok(!html.includes('<img src=x'));assert.ok(html.includes(P.version));assert.ok(html.includes('massSignature'));assert.ok(svg.includes('LDA 3,000 m'));
 const bad=base();bad.runway.condition='contaminated';assert.equal(landingChartSvg(calculate(bad,170000,context())),'');
});
for(const slope of [-2,0,2])test('最短LDA超跑道诊断轨迹保持在独立绘图区 '+slope,()=>{
 const input=base();input.runway.ldaM=300;input.runway.slopePercent=slope;
 const result=calculate(input,170000,context());assert.equal(result.status,'engineering-infeasible');
 const svg=landingChartSvg(result),d=svg.match(/<path d="([^"]+)" stroke="#6fceb2"/)[1];
 const coords=Array.from(d.matchAll(/[ML] ([\d.-]+) ([\d.-]+)/g));assert.ok(coords.length>10);
 for(const point of coords)assert.ok(Number(point[2])>=50&&Number(point[2])<=175,'高度越界 '+point[2]);
 assert.ok(landingReportHtml(result).includes(svg));
});
test('交互计算与限重搜索在500ms内完成',()=>{const start=performance.now();good();assert.ok(performance.now()-start<500);});

const output={at:new Date().toISOString(),modelVersion:P.version,cases};fs.writeFileSync('.artifacts/landing/engine-tests.json',JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));if(cases.some(c=>c.status==='FAIL'))process.exit(1);
