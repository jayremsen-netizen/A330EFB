const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),esbuild=require('esbuild');
fs.mkdirSync('.artifacts/loading',{recursive:true});
const target=path.resolve('.artifacts/loading/engine.cjs');
esbuild.buildSync({entryPoints:['local-extensions/loading/index.ts'],bundle:true,platform:'node',format:'cjs',outfile:target});
const {calculateLoading,calculateGroundCG,defaultLoading,loadingSignature,modelParameters:P}=require(target);
const cases=[];function test(name,fn){try{fn();cases.push({name,status:'PASS'});}catch(error){cases.push({name,status:'FAIL',error:String(error)});}}
function near(a,b,t=1e-7){assert.ok(Math.abs(a-b)<=t,`${a} vs ${b}`);}
function base(){return {pax:250,paxKg:80,bagKg:24,freightKg:2000,oewKg:127000,rampKg:30000,taxiKg:500};}

test('默认分配与计划旅客、行李、货物相等，独立合计力矩得到四阶段重心',()=>{
 const f=base(),input=defaultLoading(f),r=calculateLoading(f,input,8000);
 assert.equal(r.status,'engineering-feasible');assert.equal(r.canAdopt,true);
 assert.equal(r.totals.pax,250);near(r.totals.baggageKg,6000);near(r.totals.freightKg,2000);
 const mass=127000+250*80+6000+2000,moment=127000*P.geometry.oewArmM+r.stations.reduce((sum,s)=>sum+s.massKg*s.armM,0);
 near(r.points.zfw.massKg,mass);near(r.points.zfw.momentKgM,moment);
 near(r.points.zfw.cgPercentMac,(moment/mass-P.geometry.lemacM)/P.geometry.macM*100);
 near(r.points.ramp.massKg,mass+30000);near(r.points.takeoff.massKg,mass+29500);near(r.points.landing.massKg,mass+8000);
});

test('分配不等于计划时阻止结果与采用，不自动篡改配载',()=>{
 const f=base(),input=defaultLoading(f),before=JSON.stringify(input);f.pax++;
 const r=calculateLoading(f,input,8000);assert.equal(r.status,'invalid');assert.equal(r.points,null);assert.equal(r.canAdopt,false);assert.match(r.errors.join(''),/旅客|行李/);assert.equal(JSON.stringify(input),before);
});

test('缺失数组、长度、非有限数、负数、超容量及小数旅客均拒绝，不能产生 NaN 解',()=>{
 const f=base();for(const mutate of [i=>delete i.cabinPax,i=>i.cabinPax.push(0),i=>i.holdBaggageKg=[0],i=>i.holdFreightKg[0]=NaN,i=>i.cabinPax[0]=-1,i=>i.cabinPax[0]=0.5,i=>i.cabinPax[0]=101,i=>{i.holdBaggageKg[0]=12000;i.holdFreightKg[0]=9000;}]){
  const i=defaultLoading(f);mutate(i);const r=calculateLoading(f,i,8000);assert.equal(r.status,'invalid');assert.equal(r.points,null);assert.equal(r.canAdopt,false);
 }
});

test('燃油与航班数值错误、着陆油量大于起飞量拒绝，零着陆油量被保留',()=>{
 for(const patch of [{rampKg:NaN},{oewKg:0},{taxiKg:31000},{paxKg:201},{rampKg:111662},{bagKg:-1}]){const f={...base(),...patch};assert.equal(calculateLoading(f,defaultLoading(base()),8000).status,'invalid');}
 for(const fuel of [NaN,Infinity,-1,29501])assert.equal(calculateLoading(base(),defaultLoading(base()),fuel).status,'invalid');
 const r=calculateLoading(base(),defaultLoading(base()),0);near(r.points.landing.massKg,r.points.zfw.massKg);near(r.points.landing.cgPercentMac,r.points.zfw.cgPercentMac);
 assert.throws(()=>defaultLoading({...base(),pax:Infinity}));
});

test('同质量向后移动旅客产生与杠杆解析一致的重心后移',()=>{
 const f=base(),a=defaultLoading(f),b=structuredClone(a);b.cabinPax[0]-=10;b.cabinPax[3]+=10;
 const ra=calculateLoading(f,a,8000),rb=calculateLoading(f,b,8000);
 near(rb.points.zfw.massKg,ra.points.zfw.massKg);
 near(rb.points.zfw.cgPercentMac-ra.points.zfw.cgPercentMac,10*f.paxKg*(42-18)/ra.points.zfw.massKg/7*100);
});
test('向前或向后极端分配超过重心包线时保留诊断点并禁止采用',()=>{
 const f={...base(),pax:96,bagKg:0,freightKg:0,paxKg:200,rampKg:0,taxiKg:0};
 for(const cabinPax of [[96,0,0,0],[0,0,0,96]]){const r=calculateLoading(f,{cabinPax,holdBaggageKg:[0,0,0],holdFreightKg:[0,0,0]},0);assert.equal(r.status,'engineering-infeasible');assert.equal(r.canAdopt,false);assert.equal(r.points.zfw.withinCg,false);}
});
test('零载荷零油量等于 OEW，满座分配遵守站位容量，MZFW越界被阻止',()=>{
 const empty={...base(),pax:0,freightKg:0,rampKg:0,taxiKg:0},r=calculateLoading(empty,defaultLoading(empty),0);near(r.points.zfw.massKg,127000);near(r.points.zfw.cgPercentMac,30);assert.equal(r.canAdopt,true);
 const full={...base(),pax:436},i=defaultLoading(full);assert.deepEqual(i.cabinPax,[100,120,120,96]);assert.equal(calculateLoading(full,i,8000).status,'engineering-feasible');
 const heavy={...full,freightKg:30000},h=calculateLoading(heavy,defaultLoading(heavy),8000);assert.equal(h.status,'engineering-infeasible');assert.equal(h.points.zfw.withinMass,false);
});
test('燃油消耗改变质量与重心，质量与力矩差严格等于燃油消耗',()=>{
 const f=base(),r=calculateLoading(f,defaultLoading(f),8000),a=r.points.takeoff,b=r.points.landing;
 near(a.massKg-b.massKg,21500);near(a.momentKgM-b.momentKgM,21500*P.geometry.fuelArmM);assert.notEqual(a.cgPercentMac,b.cgPercentMac);
});
test('签名及导出输入快照包含数值、模型与燃油，不受采用状态影响且不修改原输入',()=>{
 const f=base(),i=defaultLoading(f),r=calculateLoading(f,i,8000),key=loadingSignature(f,i,8000);
 assert.equal(r.signature,key);assert.equal(loadingSignature({...f,acceptedLoadingSignature:'x'},i,8000),key);assert.notEqual(loadingSignature(f,i,8001),key);
 i.cabinPax[0]++;assert.notEqual(loadingSignature(f,i,8000),key);assert.equal(r.input.cabinPax[0],i.cabinPax[0]-1);assert.ok(r.model.provenance.massConfigurationUrl.includes('41eace79'));assert.match(r.model.provenance.description,/工程假设/);
});
test('地面比例装载/下客计算起终点与半载力矩一致，无合法配载时不生成重心',()=>{
 const f=base(),i=defaultLoading(f),r=calculateLoading(f,i,8000);
 const full=calculateGroundCG(f,i,{pax:250,cargoKg:8000,fuelKg:30000}),half=calculateGroundCG(f,i,{pax:125,cargoKg:4000,fuelKg:30000}),empty=calculateGroundCG(f,i,{pax:0,cargoKg:0,fuelKg:30000});
 near(full.massKg,r.points.ramp.massKg);near(full.cgPercentMac,r.points.ramp.cgPercentMac);
 near(half.massKg,127000+30000+28000/2);near(half.momentKgM,127000*P.geometry.oewArmM+30000*P.geometry.fuelArmM+r.stations.reduce((sum,s)=>sum+s.momentKgM,0)/2);
 near(empty.massKg,157000);near(empty.momentKgM,127000*P.geometry.oewArmM+30000*P.geometry.fuelArmM);
 assert.equal(calculateGroundCG({...f,pax:251},i,{pax:0,cargoKg:0,fuelKg:0}),null);
 assert.equal(calculateGroundCG(f,i,{pax:251,cargoKg:8000,fuelKg:30000}),null);
});

test('精确结构质量边界可达，上方 1 kg 只输出超限诊断',()=>{
 const f={...base(),freightKg:28000,rampKg:70500,taxiKg:500},i=defaultLoading(f),r=calculateLoading(f,i,10000);
 near(r.points.zfw.massKg,181000);near(r.points.ramp.massKg,251500);near(r.points.takeoff.massKg,251000);near(r.points.landing.massKg,191000);assert.equal(r.canAdopt,true);
 const excess=calculateLoading({...f,rampKg:70501},i,10000);assert.equal(excess.canAdopt,false);assert.equal(excess.points.ramp.withinMass,false);assert.equal(excess.points.takeoff.withinMass,false);
});
test('无着陆剩余油量时明确显示未校核，不虚构着陆重心',()=>{
 const r=calculateLoading(base(),defaultLoading(base()));assert.equal(r.points.landing,null);assert.match(r.warnings.join(''),/尚未校核/);assert.equal(r.landingFuelKg,null);
});
test('满货舱混合行李和货物自动分配不超舱位且总量守恒',()=>{
 for(const gap of [0,0.01,0.0001]){
  const f={...base(),pax:1,freightKg:44812-gap},i=defaultLoading(f),r=calculateLoading(f,i,8000);
  near(i.holdBaggageKg.reduce((a,b)=>a+b,0),24);
  near(i.holdFreightKg.reduce((a,b)=>a+b,0),f.freightKg);
  P.holds.forEach((s,j)=>assert.ok(i.holdBaggageKg[j]+i.holdFreightKg[j]<=s.capacityKg+1e-7));
  assert.equal(r.status,'engineering-feasible');
 }
});
test('空载、纯货物及混合小数质量的自动分配保持各舱容量与分项总量',()=>{
 for(const pax of [0,1,20,250])for(const bagKg of [0,1,24])for(const fraction of [0,.12345678,1]){
  const baggage=pax*bagKg,freightKg=(44836-baggage)*fraction,f={...base(),pax,bagKg,freightKg},i=defaultLoading(f);
  near(i.holdBaggageKg.reduce((a,b)=>a+b,0),baggage);near(i.holdFreightKg.reduce((a,b)=>a+b,0),freightKg);
  P.holds.forEach((s,j)=>assert.ok(i.holdBaggageKg[j]>=0&&i.holdFreightKg[j]>=0&&i.holdBaggageKg[j]+i.holdFreightKg[j]<=s.capacityKg+1e-7));
 }
});

test('地面模型拒绝负量与油箱超限，空计划的空机重心可算',()=>{
 const f=base(),i=defaultLoading(f);for(const current of [{pax:0,cargoKg:0},{pax:-1,cargoKg:0,fuelKg:0},{pax:0,cargoKg:8001,fuelKg:0},{pax:0,cargoKg:0,fuelKg:Infinity},{pax:0,cargoKg:0,fuelKg:111662}])assert.equal(calculateGroundCG(f,i,current),null);
 const empty={...f,pax:0,freightKg:0,rampKg:0,taxiKg:0},r=calculateGroundCG(empty,defaultLoading(empty),{pax:0,cargoKg:0,fuelKg:0});near(r.massKg,127000);near(r.cgPercentMac,30);
});

const output={at:new Date().toISOString(),modelVersion:P.version,cases};fs.writeFileSync('.artifacts/loading/engine-tests.json',JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));if(cases.some(c=>c.status==='FAIL'))process.exit(1);
