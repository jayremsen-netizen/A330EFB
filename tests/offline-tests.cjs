const fs=require('fs'),path=require('path'),assert=require('assert/strict');const esbuild=require('esbuild');
fs.mkdirSync('.artifacts/unit',{recursive:true});esbuild.buildSync({entryPoints:['local-extensions/flight.ts'],bundle:true,platform:'node',format:'cjs',outfile:'.artifacts/unit/flight-test.cjs'});
const x=require(path.resolve('.artifacts/unit/flight-test.cjs'));const cases=[];function test(name,fn){try{fn();cases.push({name,status:'PASS'});}catch(e){cases.push({name,status:'FAIL',error:e.message});}}
test('重量独立算例：127000 + 250×104 + 2000 = 155000；TOW 184500',()=>assert.deepEqual(x.weights(x.example()),{payload:28000,zfw:155000,ramp:185000,tow:184500}));
for(const [mass,flap,v2] of [[130000,1,146],[190000,1,153],[250000,2,165],[210000,3,148],[185000,1,151]])test(`源码表节点/独立中点 ${mass} kg CONF ${flap}`,()=>{let f=x.example();f.pax=0;f.freightKg=3000;f.rampKg=mass-130000;f.taxiKg=0;f.flaps=flap;if(f.rampKg>111665){f.freightKg+=20000;f.rampKg-=20000;}assert.equal(x.calculate(f).v2,v2);});
test('压力基准与正迎风',()=>{let f=x.example();f.weather.windKt=10;const r=x.calculate(f);assert.equal(r.pressureAltitudeFt,1450);assert.equal(r.headwindKt,10);assert.equal(r.crosswindKt,0);});
test('垂直侧风几何',()=>{let f=x.example();f.weather.windDir=100;f.weather.windKt=20;const r=x.calculate(f);assert.ok(Math.abs(r.headwindKt)<1e-10);assert.equal(r.crosswindKt,20);});
test('重量单位 roundtrip',()=>assert.ok(Math.abs(x.massConvert(x.massConvert(184500,'kg','lb'),'lb','kg')-184500)<1e-8));
test('长度单位已知参考 1000 ft = 304.8 m',()=>assert.equal(x.lengthConvert(1000,'ft','m'),304.8));
test('压力换算基准',()=>assert.ok(Math.abs(x.pressureConvert(29.921255347,'inHg','hPa')-1013.25)<0.001));
for(const [name,mutate] of [['负油量',f=>f.rampKg=-1],['滑行油大于总油',f=>f.taxiKg=40000],['非有限值',f=>f.weather.qnh=NaN],['结构超重',f=>{f.freightKg=60000;}],['短 ASDA',f=>f.runway.asda=1000],['错误机型',f=>f.profileId='A320']])test(name,()=>{const f=x.example();mutate(f);assert.equal(x.calculate(f).status,'invalid');});
for(const [name,mutate] of [['湿跑道',f=>f.runway.condition='wet'],['防冰未支持',f=>f.antiIce=true],['速度表下界外',f=>{f.pax=0;f.freightKg=0;f.rampKg=0;f.taxiKg=0;}]])test(name,()=>{const f=x.example();mutate(f);const r=x.calculate(f);assert.equal(r.status,'unsupported');assert.equal(r.v2,null);});
test('本地 JSON 往返一致',()=>assert.deepEqual(x.parseFlight(JSON.stringify(x.example())),x.example()));
test('文件缺字段拒绝',()=>assert.throws(()=>x.parseFlight('{"schemaVersion":1}')));
test('任何输入变化改变结果签名',()=>{const f=x.example();const sig=x.signature(f);f.weather.oat++;assert.notEqual(sig,x.signature(f));});
test('数据表内容变化使旧签名失效',()=>{const f=x.example(),sig=x.signature(f),old=x.profile.v2['1'][0];x.profile.v2['1'][0]=old+1;assert.notEqual(sig,x.signature(f));x.profile.v2['1'][0]=old;});
test('性能表与固定源码逐值一致',()=>{const src=fs.readFileSync('upstream/headwind/hdw-a339x/src/systems/instruments/src/MCDU/legacy/NXSpeeds.ts','utf8').split('const vs =')[0];const vals=[...src.matchAll(/\(\) => (\d+)/g)].map(m=>+m[1]);assert.deepEqual(vals,[...x.profile.v2['1'],...x.profile.v2['2'],...x.profile.v2['3']]);});
fs.writeFileSync('.artifacts/unit/offline-unit-tests.json',JSON.stringify({at:new Date().toISOString(),scope:'Software arithmetic and source-table checks; not independent aircraft calibration',cases},null,2));console.log(cases);if(cases.some(c=>c.status==='FAIL'))process.exit(1);
