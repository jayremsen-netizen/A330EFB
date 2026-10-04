import {Flight,signature} from './flight';
import {calculateFuelPlan,defaultFuelPlan} from './fuel-planning';
import {calculateLoading,defaultLoading,loadingSignature} from './loading';
import {calculateLanding,defaultLandingInput} from './landing';
import type {PlanningInputs} from './planning-schema';

export function initializePlanning(f:Flight):Flight {
 return {...f,planning:{...f.planning,schemaVersion:1,fuel:f.planning?.fuel||defaultFuelPlan(f),loading:f.planning?.loading||defaultLoading(f),landing:f.planning?.landing||defaultLandingInput(f.to)}};
}
export function changePlanning<K extends 'fuel'|'loading'|'landing'>(f:Flight,key:K,value:NonNullable<PlanningInputs[K]>):Flight {
 const planning={...f.planning,schemaVersion:1 as const,[key]:value};
 if(key==='loading'||key==='fuel')delete planning.loadingAccepted;
 return {...f,planning};
}
/** All derived masses use the current planned fuel, never an unadopted recommendation. */
export function derivePlanning(f:Flight){
 const fuel=f.planning?.fuel?calculateFuelPlan(f,f.planning.fuel):null;
 const fuelReady=fuel?.status==='engineering-feasible'&&!!fuel.planned;
 const destinationFuelKg=fuelReady?fuel!.planned!.destinationLandingFuelKg:undefined;
 const alternateFuelKg=fuelReady?fuel!.planned!.alternateLandingFuelKg:undefined;
 const loading=f.planning?.loading?calculateLoading(f,f.planning.loading,destinationFuelKg):null;
 const alternateLoading=f.planning?.loading&&alternateFuelKg!==undefined?calculateLoading(f,f.planning.loading,alternateFuelKg):null;
 const loadingKey=f.planning?.loading?planningFingerprint(JSON.stringify({loading:loadingSignature(f,f.planning.loading,destinationFuelKg),fuel:fuel?.signature||null,alternateFuelKg:alternateFuelKg??null})):'';
 const loadingReady=!!fuelReady&&!!loading?.canAdopt&&!!alternateLoading?.canAdopt;
 const loadingAccepted=loadingReady&&f.planning?.loadingAccepted===loadingKey;
 const target=f.planning?.landing?.target||'destination';
 const errors:string[]=[];
 if(!fuelReady)errors.push(fuel?'当前燃油计划存在不足、约束超限或输入待修正':'请先建立并计算航路及备降燃油计划');
 if(!loadingReady)errors.push('配载分区或目的地／备降重心尚未满足工程约束');
 else if(!loadingAccepted)errors.push('请确认与当前燃油及载荷相匹配的配载方案');
 const landingKg=errors.length?null:target==='alternate'?fuel!.planned!.alternateLandingMassKg:fuel!.planned!.destinationLandingMassKg;
 const source=target==='alternate'?'当前计划：ZFW + 停机坪燃油 − 滑行 − 航路 − 复飞及备降耗油':'当前计划：ZFW + 停机坪燃油 − 滑行 − 航路耗油';
 const massSignature=JSON.stringify({fuel:fuel?.signature||null,loading:loadingKey,accepted:loadingAccepted,target});
 return {fuel,loading,alternateLoading,loadingKey,loadingReady,loadingAccepted,landingMass:{landingKg,valid:errors.length===0,source,signature:massSignature,errors},workflowSignature:signature(f)};
}
/** Compact change detector for local confirmation, not an authentication or security signature. */
export function planningFingerprint(text:string):string{let value=0xcbf29ce484222325n;for(let i=0;i<text.length;i++){value^=BigInt(text.charCodeAt(i));value=BigInt.asUintN(64,value*0x100000001b3n);}return 'planning-v1-'+value.toString(16).padStart(16,'0');}
export function acceptLoading(f:Flight):Flight {
 const p=derivePlanning(f);if(!p.loadingReady)throw Error('当前燃油、配载或备降重心未满足工程约束，不能确认配载');
 return {...f,planning:{...f.planning,schemaVersion:1,loadingAccepted:p.loadingKey}};
}
export function planningBundle(f:Flight,confirmed:boolean){
 const p=derivePlanning(f);
 if(!confirmed||!p.landingMass.valid||!f.planning?.landing)throw Error('请先采用燃油计划、确认配载并保存确认当前航班');
 const landing=calculateLanding(f.planning.landing,p.landingMass.landingKg!,{flight:{id:f.id,number:f.number,date:f.date,to:f.to,alternate:f.alternate},massSource:p.landingMass.source,massSignature:p.landingMass.signature,workflowSignature:p.workflowSignature});
 return {schemaVersion:1,purpose:'投标演示工程模型，非航空运行依据',at:new Date().toISOString(),flight:structuredClone(f),fuel:p.fuel,loading:p.loading,alternateLoading:p.alternateLoading,landing,status:landing.status};
}
