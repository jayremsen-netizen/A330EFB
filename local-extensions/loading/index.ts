import {FUEL_CAPACITY_GALLONS,FUEL_KG_PER_GALLON} from '../fuel';
/** A longitudinal, lumped-station engineering model. No certified loading data. */
export const MODEL_VERSION='0.1.0';
export const modelParameters={
 id:'A330EFB-LONGITUDINAL-LOADING',version:MODEL_VERSION,
 provenance:{status:'assumed-engineering-configuration',description:'站位、力臂、几何及重心包线为独立工程假设，未以 A330 称重记录或获批装载手册校准。',
  formulaUrl:'https://www.faa.gov/sites/faa.gov/files/12_phak_ch10.pdf',
  upstreamCommit:'41eace79ed442696a6361dc72947954c9a6cf5cb',
  massConfigurationUrl:'https://github.com/headwindsim/aircraft/blob/41eace79ed442696a6361dc72947954c9a6cf5cb/hdw-a339x/src/base/headwindsim-aircraft-a330-900/config/a339x/a330-941/airframe.json5',
  upstreamUse:'仅引用现有项目的 OEW 127000、MZFW 181000、MTOW 251000、货舱合计 44836 kg 配置；未采用上游重心包线。'},
 geometry:{datum:'工程坐标：机鼻为原点，向后为正，单位 m',lemacM:29,macM:7,oewArmM:31.1,fuelArmM:31.8},
 cabin:[{id:'A',label:'前客舱 A',capacity:100,armM:18},{id:'B',label:'中前客舱 B',capacity:120,armM:26},{id:'C',label:'中后客舱 C',capacity:120,armM:34},{id:'D',label:'后客舱 D',capacity:96,armM:42}],
 holds:[{id:'FWD',label:'前货舱',capacityKg:20000,armM:22},{id:'AFT',label:'后货舱',capacityKg:20000,armM:36},{id:'BULK',label:'散货舱',capacityKg:4836,armM:42}],
 massLimitsKg:{zfw:181000,ramp:251500,takeoff:251000,landing:191000},
 envelope:[{massKg:127000,forward:20,aft:40},{massKg:180000,forward:15,aft:40},{massKg:251500,forward:20,aft:37}],
 assumptions:[
  '四客舱和三货舱是演示分区；容量分配、站位和力臂不是航空公司实际座舱布局或货舱限制。',
  'LEMAC 29 m、MAC 7 m、OEW 力臂 31.1 m 是独立工程几何假设，不代表 A330 测量值。',
  '全部燃油以 31.8 m 固定纵向力臂建模，未模拟分油箱消耗、配平油转输及燃油密度变化。',
  '地面装载和下客按已确认配载比例缩放各客舱人数及货舱重量，未模拟逐站先后装载。',
  '重心包线节点及停机坪 251500 kg、着陆 191000 kg 上限是演示约束，不是获批飞机限制。',
  '只计算纵向静态重心；不输出安定面配平设置，不模拟侧向重心、地板载荷、货物约束及动态载荷。',
 ],
};

export interface LoadingFlight {pax:number;paxKg:number;bagKg:number;freightKg:number;oewKg:number;rampKg:number;taxiKg:number;}
export interface LoadingInput {cabinPax:number[];holdBaggageKg:number[];holdFreightKg:number[];}
export type LoadingPhase='zfw'|'ramp'|'takeoff'|'landing';
export interface LoadingPoint {phase:LoadingPhase;massKg:number;fuelKg:number;momentKgM:number;armM:number;cgPercentMac:number;forwardLimit:number;aftLimit:number;massLimitKg:number;withinCg:boolean;withinMass:boolean;}
export interface LoadingStation {id:string;label:string;massKg:number;armM:number;momentKgM:number;}
export interface LoadingResult {
 model:typeof modelParameters;signature:string;at:string;input:LoadingInput;flight:LoadingFlight;landingFuelKg:number|null;
 status:'invalid'|'engineering-feasible'|'engineering-infeasible';canAdopt:boolean;errors:string[];warnings:string[];
 totals:{pax:number;baggageKg:number;freightKg:number;payloadKg:number}|null;stations:LoadingStation[];
 points:{zfw:LoadingPoint;ramp:LoadingPoint;takeoff:LoadingPoint;landing:LoadingPoint|null}|null;
}

const sum=(values:number[])=>values.reduce((a,b)=>a+b,0);
const projection=(f:LoadingFlight):LoadingFlight=>({pax:f.pax,paxKg:f.paxKg,bagKg:f.bagKg,freightKg:f.freightKg,oewKg:f.oewKg,rampKg:f.rampKg,taxiKg:f.taxiKg});
/** No flight metadata or acceptance state is part of this numerical-input signature. */
export const loadingSignature=(f:LoadingFlight,input:LoadingInput,landingFuelKg?:number)=>JSON.stringify({model:modelParameters,flight:projection(f),input,landingFuelKg:landingFuelKg??null});

function allocate(total:number,capacities:number[],integer:boolean):number[]{
 const capacity=sum(capacities),raw=capacities.map(v=>v*total/capacity),result=raw.map(v=>integer?Math.floor(v):Math.floor(v*100)/100);
 let remainder=total-sum(result);
 if(integer){for(let i=0;remainder>=1;i=(i+1)%result.length){result[i]++;remainder--;}}
 else result[result.length-1]=Number((result[result.length-1]+remainder).toFixed(8));
 return result;
}
/** Explicit user action only: consumers must retain existing allocations when the plan changes. */
export function defaultLoading(f:LoadingFlight):LoadingInput {
 const errors=flightIssues(f);if(errors.length)throw Error(errors.join('；'));
 return {cabinPax:allocate(f.pax,modelParameters.cabin.map(s=>s.capacity),true),holdBaggageKg:allocate(f.pax*f.bagKg,modelParameters.holds.map(s=>s.capacityKg),false),holdFreightKg:allocate(f.freightKg,modelParameters.holds.map(s=>s.capacityKg),false)};
}
function flightIssues(f:LoadingFlight):string[]{
 const errors:string[]=[];
 for(const key of ['pax','paxKg','bagKg','freightKg','oewKg','rampKg','taxiKg'] as const)if(typeof f?.[key]!=='number'||!Number.isFinite(f[key])||f[key]<0)errors.push(`${key} 须为非负有限数`);
 if(errors.length)return errors;
 if(!Number.isInteger(f.pax)||f.pax>436)errors.push('旅客人数须为 0–436 人的整数');
 if(f.paxKg<1||f.paxKg>200||f.bagKg>100)errors.push('人均重量超出输入范围');
 if(f.oewKg!==127000)errors.push('OEW 必须为本机型包 127000 kg');
 if(f.pax*f.bagKg+f.freightKg>44836)errors.push('行李与货物合计超过 44836 kg');
 if(f.taxiKg>f.rampKg)errors.push('滑行耗油超过停机坪燃油');
 if(f.rampKg>FUEL_CAPACITY_GALLONS*FUEL_KG_PER_GALLON)errors.push('停机坪燃油超过现有油箱配置容量');
 return errors;
}
export function envelopeAt(massKg:number):{forward:number;aft:number}{
 const nodes=modelParameters.envelope;
 const lo=massKg<=nodes[0].massKg?nodes[0]:[...nodes].reverse().find(p=>p.massKg<=massKg)!;
 const hi=nodes.find(p=>p.massKg>=massKg)||nodes[nodes.length-1];
 const t=hi.massKg===lo.massKg?0:(massKg-lo.massKg)/(hi.massKg-lo.massKg);
 return {forward:lo.forward+(hi.forward-lo.forward)*t,aft:lo.aft+(hi.aft-lo.aft)*t};
}
export function calculateLoading(f:LoadingFlight,input:LoadingInput,landingFuelKg?:number):LoadingResult {
 const invalid=(errors:string[],totals:LoadingResult['totals']=null):LoadingResult=>({model:modelParameters,signature:loadingSignature(f,input,landingFuelKg),at:new Date().toISOString(),input:structuredClone(input),flight:projection(f),landingFuelKg:landingFuelKg??null,status:'invalid',canAdopt:false,errors,warnings:[],totals,stations:[],points:null});
 const invalidInput:string[]=[];
 invalidInput.push(...flightIssues(f));
 if(landingFuelKg!==undefined&&(typeof landingFuelKg!=='number'||!Number.isFinite(landingFuelKg)||landingFuelKg<0||landingFuelKg>f.rampKg-f.taxiKg))invalidInput.push('着陆剩余燃油须为 0 至起飞燃油之间的有限数');
 const groups=[['cabinPax',4],['holdBaggageKg',3],['holdFreightKg',3]] as const;
 for(const [key,length] of groups){
  const array=input?.[key];
  if(!Array.isArray(array)||array.length!==length)invalidInput.push(`${key} 必须有 ${length} 个站位`);
  else if(Array.from(array).some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0))invalidInput.push(`${key} 必须为非负有限数`);
 }
 if(invalidInput.length)return invalid(invalidInput);
 modelParameters.cabin.forEach((station,i)=>{if(!Number.isInteger(input.cabinPax[i])||input.cabinPax[i]>station.capacity)invalidInput.push(`${station.label} 须为 0–${station.capacity} 人的整数`);});
 modelParameters.holds.forEach((station,i)=>{if(input.holdBaggageKg[i]+input.holdFreightKg[i]>station.capacityKg+1e-6)invalidInput.push(`${station.label} 行李与货物合计超过演示容量 ${station.capacityKg} kg`);});
 if(invalidInput.length)return invalid(invalidInput);
 const totals={pax:sum(input.cabinPax),baggageKg:sum(input.holdBaggageKg),freightKg:sum(input.holdFreightKg),payloadKg:0};
 totals.payloadKg=totals.pax*f.paxKg+totals.baggageKg+totals.freightKg;
 const allocationErrors:string[]=[];
 if(totals.pax!==f.pax)allocationErrors.push(`客舱旅客合计 ${totals.pax} 与计划 ${f.pax} 不符`);
 if(Math.abs(totals.baggageKg-f.pax*f.bagKg)>1e-6)allocationErrors.push(`货舱行李合计 ${totals.baggageKg} kg 与计划 ${f.pax*f.bagKg} kg 不符`);
 if(Math.abs(totals.freightKg-f.freightKg)>1e-6)allocationErrors.push(`货舱货物合计 ${totals.freightKg} kg 与计划 ${f.freightKg} kg 不符`);
 if(allocationErrors.length)return invalid(allocationErrors,totals);
 const stations=[...modelParameters.cabin.map((s,i)=>({id:s.id,label:s.label,armM:s.armM,massKg:input.cabinPax[i]*f.paxKg})),...modelParameters.holds.map((s,i)=>({id:s.id,label:s.label,armM:s.armM,massKg:input.holdBaggageKg[i]+input.holdFreightKg[i]}))].map(s=>({...s,momentKgM:s.massKg*s.armM}));
 const mass=f.oewKg+totals.payloadKg,moment=f.oewKg*modelParameters.geometry.oewArmM+sum(stations.map(s=>s.momentKgM));
 const point=(phase:LoadingPhase,fuelKg:number):LoadingPoint=>{
  const massKg=mass+fuelKg,momentKgM=moment+fuelKg*modelParameters.geometry.fuelArmM,armM=momentKgM/massKg,cgPercentMac=(armM-modelParameters.geometry.lemacM)/modelParameters.geometry.macM*100;
  const limits=envelopeAt(massKg),massLimitKg=modelParameters.massLimitsKg[phase];
  return {phase,massKg,fuelKg,momentKgM,armM,cgPercentMac,forwardLimit:limits.forward,aftLimit:limits.aft,massLimitKg,withinCg:cgPercentMac>=limits.forward&&cgPercentMac<=limits.aft,withinMass:massKg<=massLimitKg};
 };
 const points={zfw:point('zfw',0),ramp:point('ramp',f.rampKg),takeoff:point('takeoff',f.rampKg-f.taxiKg),landing:landingFuelKg===undefined?null:point('landing',landingFuelKg)};
 const errors:string[]=[];
 for(const p of Object.values(points))if(p){if(!p.withinCg)errors.push(`${p.phase} 重心超出演示工程包线`);if(!p.withinMass)errors.push(`${p.phase} 质量超过模型上限 ${p.massLimitKg} kg`);}
 return {model:modelParameters,signature:loadingSignature(f,input,landingFuelKg),at:new Date().toISOString(),input:structuredClone(input),flight:projection(f),landingFuelKg:landingFuelKg??null,status:errors.length?'engineering-infeasible':'engineering-feasible',canAdopt:errors.length===0,errors,warnings:landingFuelKg===undefined?['未提供着陆剩余燃油：着陆重心尚未校核。']:[],totals,stations,points};
}

/** Caller must independently verify acceptance of this exact allocation signature. */
export function calculateGroundCG(f:LoadingFlight,input:LoadingInput,current:{pax:number;cargoKg:number;fuelKg:number}):LoadingPoint|null {
 const plan=calculateLoading(f,input);
 if(!plan.canAdopt||!plan.points||!plan.totals)return null;
 const plannedCargo=plan.totals.baggageKg+plan.totals.freightKg;
 if((['pax','cargoKg','fuelKg'] as const).some(key=>!Number.isFinite(current?.[key])||current[key]<0)||!Number.isInteger(current.pax)||current.pax>f.pax||current.cargoKg>plannedCargo+1e-6||current.fuelKg>FUEL_CAPACITY_GALLONS*FUEL_KG_PER_GALLON)return null;
 const paxScale=f.pax?current.pax/f.pax:0,cargoScale=plannedCargo?current.cargoKg/plannedCargo:0;
 const payloadMoment=plan.stations.reduce((moment,s,i)=>moment+s.momentKgM*(i<modelParameters.cabin.length?paxScale:cargoScale),0);
 const massKg=f.oewKg+current.pax*f.paxKg+current.cargoKg+current.fuelKg,momentKgM=f.oewKg*modelParameters.geometry.oewArmM+payloadMoment+current.fuelKg*modelParameters.geometry.fuelArmM;
 const armM=momentKgM/massKg,cgPercentMac=(armM-modelParameters.geometry.lemacM)/modelParameters.geometry.macM*100,limits=envelopeAt(massKg);
 return {phase:'ramp',massKg,fuelKg:current.fuelKg,momentKgM,armM,cgPercentMac,forwardLimit:limits.forward,aftLimit:limits.aft,massLimitKg:modelParameters.massLimitsKg.ramp,withinCg:cgPercentMac>=limits.forward&&cgPercentMac<=limits.aft,withinMass:massKg<=modelParameters.massLimitsKg.ramp};
}
