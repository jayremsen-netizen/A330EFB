const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),esbuild=require('esbuild');
const dir='.artifacts/remediation-v131';fs.mkdirSync(dir,{recursive:true});
function moduleFrom(source){const dest=path.resolve(dir+'/'+path.basename(source).replace('.ts','.cjs'));esbuild.buildSync({entryPoints:[source],bundle:true,platform:'node',format:'cjs',outfile:dest});return require(dest);}
const flight=moduleFrom('local-extensions/flight.ts'),files=moduleFrom('local-extensions/flight-file.ts'),ground=moduleFrom('local-extensions/ground-plan.ts'),{DemoRuntime}=moduleFrom('local-extensions/demo-runtime.ts'),{scenarioClock}=moduleFrom('local-efb/scenario-clock.ts'),planning=moduleFrom('local-extensions/planning-context.ts');
const cases=[];function test(name,fn){try{fn();cases.push({name,status:'PASS'});}catch(e){cases.push({name,status:'FAIL',error:String(e)});}}
test('完整航班文件保持兼容并严格校验',()=>{const f=flight.example(),value=files.flightFile(f);assert.equal(value.schemaVersion,1);assert.deepEqual(files.parseFlightFile(JSON.stringify(value)),{kind:'flight',flight:f});f.freightKg=NaN;assert.throws(()=>files.parseFlightFile(JSON.stringify(f)));});
test('空基础数值和未完成文本以草稿回导',()=>{const f=flight.example();f.freightKg=NaN;f.number='';const data=files.flightFile(f);assert.equal(data.format,'a330efb-flight-draft');assert.equal(data.formatVersion,1);const r=files.parseFlightFile(JSON.stringify(data));assert.equal(r.kind,'draft');assert.ok(Number.isNaN(r.flight.freightKg));assert.equal(r.flight.number,'');assert.ok(flight.validate(r.flight).length);assert.equal(Object.hasOwn(data,'confirmed'),false);});
test('完整输入也能作为未确认草稿导出',()=>{const f=flight.example();assert.equal(files.parseFlightFile(JSON.stringify(files.flightFile(f,true))).kind,'draft');});
test('工程空数值安全恢复并撤销配载确认',()=>{const f=planning.acceptLoading(planning.initializePlanning(flight.example()));f.planning.fuel.policy.extraKg=NaN;const r=files.parseFlightFile(JSON.stringify(files.flightFile(f)));assert.ok(Number.isNaN(r.flight.planning.fuel.policy.extraKg));assert.equal(r.flight.planning.loadingAccepted,undefined);assert.equal(planning.derivePlanning(r.flight).landingMass.valid,false);});
test('草稿拒绝损坏结构、未知版本和超限文件',()=>{const value=files.flightFile(flight.example(),true);assert.throws(()=>files.parseFlightFile(JSON.stringify({...value,formatVersion:2})));assert.throws(()=>files.parseFlightFile(JSON.stringify({...value,flight:{...value.flight,runway:null}})));assert.throws(()=>files.parseFlightFile(JSON.stringify({...value,flight:{...value.flight,pax:'250'}})));assert.throws(()=>files.parseFlightFile(' '.repeat(524289)));});
test('加油回执固定航班及提交目标，油量变化才标记旧计划',()=>{
 const f=flight.example(),m=new DemoRuntime(),owner=ground.commandPlan(f,'refuel');
 const c=m.submit('fuel','refuel',f.rampKg,0,undefined,0,owner);m.tick(0);f.rampKg=21257;
 assert.equal(c.plan.flightId,f.id);assert.equal(c.plan.fuelTargetKg,30000);assert.equal(ground.commandUsesOldPlan(c,f),true);
 m.tick(3000);assert.equal(m.snapshot().fuelKg,30000);assert.equal(m.submit('fuel','refuel',21257,4000,undefined,0,ground.commandPlan(f,'refuel')).plan.fuelTargetKg,30000);
 f.rampKg=30000;f.number='RENAME';f.route='OTHER TEXT';assert.equal(ground.commandUsesOldPlan(c,f),false);
 f.id='ANOTHER';assert.equal(ground.commandUsesOldPlan(c,f),true);
});
test('登机人数或货物变更使回执过期，无关油量不会误标',()=>{
 const f=flight.example(),m=new DemoRuntime(),c=m.submit('load','board',f.pax,0,undefined,f.pax*f.bagKg+f.freightKg,ground.commandPlan(f,'board'));
 f.rampKg=29000;assert.equal(ground.commandUsesOldPlan(c,f),false);f.pax=249;assert.equal(ground.commandUsesOldPlan(c,f),true);f.pax=250;f.freightKg++;assert.equal(ground.commandUsesOldPlan(c,f),true);
 assert.equal(c.plan.paxTarget,250);assert.equal(c.plan.cargoTargetKg,8000);
});
test('实际准备状态独立于计划确认，差额按实际减当前目标计算',()=>{
 const f=flight.example(),m=new DemoRuntime();m.reset(true,30000,250,0,8000);
 let r=ground.groundPreparation(f,m.snapshot(),true);assert.equal(r.ready,true);assert.equal(r.planConfirmed,true);
 f.rampKg=21257;r=ground.groundPreparation(f,m.snapshot(),true);assert.equal(r.ready,false);assert.equal(r.planConfirmed,true);assert.equal(r.fuelDifferenceKg,8743);
 f.rampKg=30000;m.submit('unload','deboard',undefined,0);r=ground.groundPreparation(f,m.snapshot(),true);assert.equal(r.ready,false);assert.ok(r.issues.some(x=>x.includes('执行')));
 r=ground.groundPreparation(f,m.snapshot(),false);assert.equal(r.planConfirmed,false);assert.ok(r.issues.some(x=>x.includes('未确认')));
});
test('场景时钟跟随有效航班日期而固定0800Z，无效日期采用明确后备样例',()=>{const t=scenarioClock('2026-10-05');assert.equal(t.date,'2026-10-05');assert.equal(t.dayOfWeek,1);assert.equal(t.month,10);assert.equal(t.day,5);assert.equal(t.zuluSeconds,28800);assert.equal(t.fallback,false);assert.equal(scenarioClock('2026-02-31').fallback,true);assert.equal(scenarioClock('').date,'2026-10-03');});
fs.writeFileSync(dir+'/unit-tests.json',JSON.stringify({at:new Date().toISOString(),cases},null,2));console.log(cases);if(cases.some(x=>x.status==='FAIL'))process.exit(1);
