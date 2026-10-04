import {profile,weights} from '../flight';
import type {Flight} from '../flight';
import {FUEL_CAPACITY_GALLONS,FUEL_KG_PER_GALLON} from '../fuel';
import type {FuelFlightSnapshot,FuelLeg,FuelMassCase,FuelPhase,FuelPlanInput,FuelPlanResult,FuelSegmentResult,FuelTotals} from './types';

export const FUEL_MODEL_VERSION='0.1.0';
export const fuelModel:FuelPlanResult['model']={id:'A339-ROUTE-FUEL-ENGINEERING',version:FUEL_MODEL_VERSION,reservePolicy:'configurable-demo-policy',limits:{fuelCapacityKg:FUEL_CAPACITY_GALLONS*FUEL_KG_PER_GALLON,mtowKg:profile.structuralMtowKg,mzfwKg:profile.maxZfwKg,mlwKg:191000},sources:[
 {title:'EASA CAT.OP.MPA.181 / AMC fuel planning categories',url:'https://www.easa.europa.eu/en/document-library/easy-access-rules/online-publications/easy-access-rules-air-operations?erules-id=ERULES-1963177438-12803',use:'仅参考燃油分类与术语；未实现运行人燃油方案批准或合规判定。'},
 {title:'FAA Fuel Requirements Working Group report',url:'https://www.faa.gov/media/32056',use:'历史技术说明中的滑行、航程、备降及储备分类；不作为当前法规符合性依据。'},
 {title:'Airbus Safety First — Fuel monitoring',url:'https://safetyfirst.airbus.com/fuel-monitoring-on-a320-family-aircraft/',use:'参考燃油实测与计划对照的监控思想，不提供 A330 油耗数据。'},
],assumptions:[
 '全部航段距离、TAS、迎风和油耗率由用户明确输入；默认值为自制演示样例，非 A330 校准性能数据。航路文字不解析为 AIRAC 航路。',
 '巡航地速 = TAS − 迎风，顺风以负迎风输入；时间 = 距离 / 地速，燃油 = 时间 × 固定油耗率。忽略高度、质量、温度与爬升能力对油耗率的反馈。',
 '主航程由爬升、显式巡航航段和下降组成；备降由目的地复飞及爬升、显式备降巡航航段和备降下降组成。各段距离不能重复录入。',
 '演示储备策略：应急燃油取航程百分比与录入最低量的较大值；最终储备按录入等待时间和假设油耗率计算；额外燃油单列。数值可配置，不代表任何监管批准策略。',
 '建议停机坪燃油为六类燃油之和向上取整至 1 kg。滑行采用当前航班 taxiKg，仅计一次；采用按钮只更新停机坪燃油，不改载荷或滑行耗油。',
 '着陆质量按未消耗应急、最终储备和额外燃油的名义航程估算；实际延误和异常耗油会降低余量。未覆盖 ETOPS、减压/单发关键燃油、再签派、无备降与多备降放行。',
 '容量、MTOW、MZFW沿用本项目固定机型配置；191000 kg MLW是本项目一致的演示质量约束，不是适航或 AFM 校核结论。',
]};

function flightSnapshot(f:Flight):FuelFlightSnapshot {const {id,number,date,profileId,from,to,alternate,route,pax,paxKg,bagKg,freightKg,oewKg,rampKg,taxiKg}=f;return {id,number,date,profileId,from,to,alternate,route,pax,paxKg,bagKg,freightKg,oewKg,rampKg,taxiKg};}
export function fuelPlanSignature(f:Flight,input:FuelPlanInput){return JSON.stringify({flight:flightSnapshot(f),input,model:fuelModel});}
export function defaultFuelPlan(f:Flight):FuelPlanInput {
 const source='A330EFB 手工工程样例；非权威航路或性能数据';
 const phase=(minutes:number,distanceNm:number,fuelFlowKgPerHour:number)=>({minutes,distanceNm,fuelFlowKgPerHour,source});
 const leg=(id:string,label:string,distanceNm:number,tasKt:number,fuelFlowKgPerHour:number):FuelLeg=>({id,label,distanceNm,tasKt,headwindKt:0,fuelFlowKgPerHour,source});
 return {schemaVersion:1,airports:{from:f.from,to:f.to,alternate:f.alternate},route:f.route,source,cruiseAltitudeFt:35000,alternateAltitudeFt:10000,routeLegs:[leg('route-1','主航路巡航（不含爬降距离）',900,450,5400)],alternateLegs:[leg('alternate-1','备降巡航（不含复飞与下降）',25,250,5000)],climb:phase(20,110,9000),descent:phase(20,100,3000),missedApproach:phase(10,35,8500),alternateDescent:phase(8,25,3000),policy:{contingencyPercent:5,contingencyMinimumKg:0,holdingMinutes:30,holdingFlowKgPerHour:4800,extraKg:500,source:'可配置工程演示储备策略；不是批准的运行人燃油政策'}};
}

export function validateFuelPlan(f:Flight,value:unknown):string[] {
 const errors:string[]=[];
 const obj=(v:any)=>v&&typeof v==='object'&&!Array.isArray(v);
 const text=(v:any,max=500)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
 const range=(v:any,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
 if(!obj(value))return ['燃油规划必须为完整对象'];
 const i=value as FuelPlanInput;
 if(i.schemaVersion!==1)errors.push('燃油规划版本不兼容');
 if(!obj(i.airports)||!['from','to','alternate'].every(k=>/^[A-Z]{4}$/.test((i.airports as any)?.[k]||'')))errors.push('规划必须记录出发、目的和一个备降机场的 ICAO');
 else if(i.airports.from!==f.from||i.airports.to!==f.to||i.airports.alternate!==f.alternate)errors.push('航班机场已变化，请复核距离、油耗及备降方案后显式关联当前机场');
 if(i.route!==f.route)errors.push('航班航路文字已变化，请复核各手工航段后显式关联当前航路');
 if(!text(i.source)||typeof i.route!=='string'||i.route.length>500)errors.push('规划来源或关联航路文字无效');
 if(!range(i.cruiseAltitudeFt,1000,43000)||!range(i.alternateAltitudeFt,1000,43000))errors.push('示意高度须为 1000–43000 ft');
 const ids=new Set<string>();
 for(const [key,label] of [['routeLegs','主航路'],['alternateLegs','备降航路']] as const){
  const legs=i[key];if(!Array.isArray(legs)||!legs.length||legs.length>50){errors.push(label+'须含 1–50 个显式航段');continue;}
  for(const leg of legs){
   if(!obj(leg)||!text(leg.id,100)||!text(leg.label,150)||!text(leg.source)){errors.push(label+'航段标识、名称或来源无效');continue;}
   if(ids.has(leg.id))errors.push('航段标识不能重复');ids.add(leg.id);
   if(!range(leg.distanceNm,0,20000)||!range(leg.tasKt,1,700)||!range(leg.headwindKt,-250,700)||!range(leg.fuelFlowKgPerHour,1,50000))errors.push(label+'航段距离、空速、风或油耗率超出工程录入范围');
   if(leg.tasKt-leg.headwindKt<=0)errors.push(label+'地速须大于零，无法按当前风况前进');
  }
 }
 for(const key of ['climb','descent','missedApproach','alternateDescent'] as const){const p=i[key];if(!obj(p)||!text(p.source)||!range(p.minutes,0,180)||!range(p.distanceNm,0,1500)||!range(p.fuelFlowKgPerHour,1,50000)||(p.minutes===0&&p.distanceNm!==0))errors.push(key+' 阶段时间、距离、油耗率或来源无效；零时长不能跨越正距离');}
 const p=i.policy;
 if(!obj(p)||!range(p.contingencyPercent,0,30)||!range(p.contingencyMinimumKg,0,50000)||!range(p.holdingMinutes,1,180)||!range(p.holdingFlowKgPerHour,1,50000)||!range(p.extraKg,0,100000)||!text(p.source))errors.push('工程储备策略的时间、比例、燃油或来源无效');
 for(const key of ['pax','paxKg','bagKg','freightKg','oewKg','rampKg','taxiKg'] as const)if(!range(f[key],0,1000000))errors.push('航班 '+key+' 必须为非负有限数');
 if(!Number.isInteger(f.pax)||f.pax>436||f.paxKg<1||f.paxKg>200||f.bagKg>100||f.pax*f.bagKg+f.freightKg>44836)errors.push('航班载荷不符合本项目机型配置');
 if(f.oewKg!==profile.oewKg||f.profileId!==profile.profileId)errors.push('燃油规划仅支持当前 A330-941 演示机型配置');
 return errors;
}

export function calculateFuelPlan(f:Flight,input:FuelPlanInput):FuelPlanResult {
 const result:FuelPlanResult={status:'engineering-feasible',label:'工程燃油预算满足',at:new Date().toISOString(),signature:fuelPlanSignature(f,input),input:structuredClone(input),flight:flightSnapshot(f),model:structuredClone(fuelModel),errors:[],warnings:['工程油耗与储备假设，不能用于实际运行放行。'],canApply:true,requiredRampKg:null,plannedMarginKg:null,totals:null,planned:null,required:null,segments:[],checks:[]};
 result.errors=validateFuelPlan(f,input);if(result.errors.length){result.status='invalid';result.label='输入或航路关联无效，未生成燃油建议';result.canApply=false;return result;}
 const segments=result.segments;
 const phase=(id:string,label:string,p:FuelPhase,route:'destination'|'alternate',kind:FuelSegmentResult['phase'],endAltitudeFt:number)=>segments.push({id,label,route,phase:kind,distanceNm:p.distanceNm,minutes:p.minutes,fuelKg:p.minutes/60*p.fuelFlowKgPerHour,groundSpeedKt:null,endAltitudeFt,source:p.source});
 const legs=(values:FuelLeg[],route:'destination'|'alternate',altitude:number)=>values.forEach(p=>{const speed=p.tasKt-p.headwindKt;segments.push({id:p.id,label:p.label,route,phase:'cruise',distanceNm:p.distanceNm,minutes:p.distanceNm/speed*60,fuelKg:p.distanceNm/speed*p.fuelFlowKgPerHour,groundSpeedKt:speed,endAltitudeFt:altitude,source:p.source});});
 phase('climb','起飞及爬升',input.climb,'destination','climb',input.cruiseAltitudeFt);legs(input.routeLegs,'destination',input.cruiseAltitudeFt);phase('descent','下降、进近及着陆',input.descent,'destination','descent',0);
 phase('missed-approach','目的地复飞及备降爬升',input.missedApproach,'alternate','missed-approach',input.alternateAltitudeFt);legs(input.alternateLegs,'alternate',input.alternateAltitudeFt);phase('alternate-descent','备降下降、进近及着陆',input.alternateDescent,'alternate','descent',0);
 const sum=(route:'destination'|'alternate',key:'fuelKg'|'minutes'|'distanceNm')=>segments.filter(s=>s.route===route).reduce((v,s)=>v+s[key],0);
 const tripKg=sum('destination','fuelKg');
 const totals:FuelTotals={tripKg,contingencyKg:Math.max(tripKg*input.policy.contingencyPercent/100,input.policy.contingencyMinimumKg),alternateKg:sum('alternate','fuelKg'),finalReserveKg:input.policy.holdingMinutes/60*input.policy.holdingFlowKgPerHour,extraKg:input.policy.extraKg,taxiKg:f.taxiKg,tripMinutes:sum('destination','minutes'),alternateMinutes:sum('alternate','minutes'),tripDistanceNm:sum('destination','distanceNm'),alternateDistanceNm:sum('alternate','distanceNm'),roundingKg:0};
 const rawRequired=totals.tripKg+totals.contingencyKg+totals.alternateKg+totals.finalReserveKg+totals.extraKg+totals.taxiKg;
 result.requiredRampKg=Math.ceil(rawRequired);totals.roundingKg=result.requiredRampKg-rawRequired;result.totals=totals;result.plannedMarginKg=f.rampKg-result.requiredRampKg;
 const zfw=weights(f).zfw;
 const massCase=(rampFuelKg:number):FuelMassCase=>{const takeoffFuelKg=rampFuelKg-f.taxiKg,destinationLandingFuelKg=takeoffFuelKg-tripKg,alternateLandingFuelKg=destinationLandingFuelKg-totals.alternateKg;return {rampFuelKg,takeoffFuelKg,destinationLandingFuelKg,alternateLandingFuelKg,zfwKg:zfw,takeoffMassKg:zfw+takeoffFuelKg,destinationLandingMassKg:zfw+destinationLandingFuelKg,alternateLandingMassKg:zfw+alternateLandingFuelKg,destinationReserveMarginKg:destinationLandingFuelKg-totals.alternateKg-totals.finalReserveKg,alternateReserveMarginKg:alternateLandingFuelKg-totals.finalReserveKg};};
 result.planned=massCase(f.rampKg);result.required=massCase(result.requiredRampKg);
 const limits=fuelModel.limits;
 for(const kind of ['planned','required'] as const){const m=result[kind]!;
  for(const [id,label,actual,limit] of [
   ['capacity','油箱容量',m.rampFuelKg,limits.fuelCapacityKg],['mtow','起飞质量上限',m.takeoffMassKg,limits.mtowKg],['mzfw','零燃油质量上限',m.zfwKg,limits.mzfwKg],['destination-mlw','目的地着陆质量上限',m.destinationLandingMassKg,limits.mlwKg],['alternate-mlw','备降着陆质量上限',m.alternateLandingMassKg,limits.mlwKg],
  ] as [string,string,number,number][])result.checks.push({id,label,case:kind,passed:actual<=limit+1e-7,actual,limit,unit:'kg'});
 }
 result.canApply=result.checks.filter(c=>c.case==='required').every(c=>c.passed);
 const massExceeded=result.checks.some(c=>!c.passed);
 for(const kind of ['planned','required'] as const){const m=result[kind]!;
  for(const [id,label,actual,limit] of [
   ['block-budget','停机坪燃油满足工程预算',m.rampFuelKg,result.requiredRampKg],['destination-reserve','目的地保有备降及最终储备',m.destinationLandingFuelKg,totals.alternateKg+totals.finalReserveKg],['alternate-reserve','备降着陆保有最终储备',m.alternateLandingFuelKg,totals.finalReserveKg],
  ] as [string,string,number,number][])result.checks.push({id,label,case:kind,passed:actual+1e-7>=limit,actual,limit,unit:'kg'});
 }
 if(massExceeded){result.status='engineering-limit-exceeded';result.label='工程质量或容量约束超限，请调整方案';}
 else if(result.checks.some(c=>c.case==='planned'&&!c.passed)){result.status='engineering-shortfall';result.label='当前计划燃油不足，可查看并采用可行工程建议';}
 if(result.planned.destinationLandingFuelKg<0||result.planned.alternateLandingFuelKg<0)result.warnings.push('着陆燃油账出现负值表示计划无法完成该航程；这是缺口诊断，不表示飞机有负油量。对应着陆质量不得用于其他性能模块。');
 return result;
}
