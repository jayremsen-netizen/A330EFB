import type {LoadingInput} from './loading';
import type {FuelPlanInput} from './fuel-planning';
import type {LandingInput} from './landing';

export interface PlanningInputs {
 schemaVersion:1;fuel?:FuelPlanInput;loading?:LoadingInput;landing?:LandingInput;loadingAccepted?:string;
}
type Shape='number'|'text'|{[key:string]:Shape}|{array:Shape;min:number;max:number};
const phase={minutes:'number',distanceNm:'number',fuelFlowKgPerHour:'number',source:'text'} as const;
const leg={id:'text',label:'text',distanceNm:'number',tasKt:'number',headwindKt:'number',fuelFlowKgPerHour:'number',source:'text'} as const;
const shapes:Record<'loading'|'fuel'|'landing',Shape>={
 loading:{cabinPax:{array:'number',min:4,max:4},holdBaggageKg:{array:'number',min:3,max:3},holdFreightKg:{array:'number',min:3,max:3}},
 fuel:{schemaVersion:'number',airports:{from:'text',to:'text',alternate:'text'},route:'text',source:'text',cruiseAltitudeFt:'number',alternateAltitudeFt:'number',routeLegs:{array:leg,min:1,max:50},alternateLegs:{array:leg,min:1,max:50},climb:phase,descent:phase,missedApproach:phase,alternateDescent:phase,policy:{contingencyPercent:'number',contingencyMinimumKg:'number',holdingMinutes:'number',holdingFlowKgPerHour:'number',extraKg:'number',source:'text'}},
 landing:{target:'text',airport:'text',runway:{ident:'text',headingDeg:'number',ldaM:'number',elevationFt:'number',slopePercent:'number',condition:'text',source:'text'},weather:{station:'text',oatC:'number',qnhHpa:'number',windDirDeg:'number',windKt:'number',gustKt:'number',source:'text'},configuration:'text',autobrake:'text',reversers:'number',approachAdditiveKt:'number',distanceFactor:'number'},
};
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
function copy(value:unknown,shape:Shape,draft:boolean,path:string):any{
 if(shape==='number'){
  if(draft&&(value===null||(typeof value==='number'&&Number.isNaN(value))))return NaN;
  if(typeof value!=='number'||!Number.isFinite(value))throw Error(path+' 必须是有限数');return value;
 }
 if(shape==='text'){if(typeof value!=='string'||value.length>1000)throw Error(path+' 文本无效');return value;}
 if('array' in shape){const spec=shape as {array:Shape;min:number;max:number};if(!Array.isArray(value)||value.length<spec.min||value.length>spec.max)throw Error(path+' 分区或航段数量无效');return value.map((v,i)=>copy(v,spec.array,draft,path+'.'+i));}
 if(!object(value))throw Error(path+' 结构无效');
 const expected=Object.keys(shape);if(Object.keys(value).some(k=>!expected.includes(k)))throw Error(path+' 含未支持字段');
 return Object.fromEntries(expected.map(k=>[k,copy(value[k],shape[k],draft,path+'.'+k)]));
}
/** Restore editable numbers while rejecting malformed objects before they reach page controls. */
export function restorePlanning(value:unknown,draft=true):PlanningInputs{
 if(!object(value)||value.schemaVersion!==1)throw Error('工程计划模式不兼容');
 if(Object.keys(value).some(k=>!['schemaVersion','fuel','loading','landing','loadingAccepted'].includes(k)))throw Error('工程计划含未支持字段');
 const result:PlanningInputs={schemaVersion:1};
 for(const key of ['fuel','loading','landing'] as const)if(value[key]!==undefined)(result as any)[key]=copy(value[key],shapes[key],draft,'工程计划.'+key);
 if(result.fuel&&result.fuel.schemaVersion!==1)throw Error('燃油计划模式不兼容');
 if(value.loadingAccepted!==undefined){if(typeof value.loadingAccepted!=='string'||value.loadingAccepted.length>128)throw Error('配载确认标识无效');result.loadingAccepted=value.loadingAccepted;}
 return result;
}
export function planningShapeErrors(value:unknown):string[]{if(value===undefined)return [];try{restorePlanning(value,false);return [];}catch(e){return [e instanceof Error?e.message:String(e)];}}
