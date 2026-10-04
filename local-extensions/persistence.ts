import {Flight,example,validate,signature,calculate,profile} from './flight';
type Result=ReturnType<typeof calculate>;
const object=(v:any)=>!!v&&typeof v==='object'&&!Array.isArray(v);

/** A draft may contain blank numbers and unfinished text, but must keep the schema shape. */
export function restoreDraft(value:any):Flight {
  if(!object(value)||value.schemaVersion!==1||value.profileId!==profile.profileId)throw Error('草稿机型或模式不兼容');
  const template=example();
  const copy=(source:any,target:any):any=>{
    if(!object(source))throw Error('草稿结构不完整');
    const out:any={};
    for(const [key,base] of Object.entries(target)){
      const v=source[key];
      if(object(base))out[key]=copy(v,base);
      else if(typeof base==='number'){
        if(v!==null&&(typeof v!=='number'||!Number.isFinite(v)))throw Error('草稿数值字段无效');
        out[key]=v===null?NaN:v;
      }else if(typeof base==='string'){
        if(typeof v!=='string'||v.length>500)throw Error('草稿文本字段无效');out[key]=v;
      }else{if(typeof v!==typeof base)throw Error('草稿选项无效');out[key]=v;}
    }
    return out;
  };
  const f=copy(value,template) as Flight;
  for(const key of ['source','observedAt','station','supersededSource'] as const){
    const v=value.weather[key];if(v!==undefined){if(typeof v!=='string'||v.length>300)throw Error('天气来源无效');f.weather[key]=v;}
  }
  if(value.departureReview!==undefined){
    const r=value.departureReview;
    if(!object(r)||typeof r.airport!=='string'||typeof r.previousAirport!=='string'||r.airport.length>500||r.previousAirport.length>500||typeof r.weather!=='boolean'||typeof r.runway!=='boolean')throw Error('起飞机场资料复核状态无效');
    f.departureReview={airport:r.airport,previousAirport:r.previousAirport,weather:r.weather,runway:r.runway};
  }
  return f;
}

export function validSavedResult(r:any):r is Result {
  try{
    if(!object(r)||!object(r.input)||validate(r.input).length||r.status!=='reference-only'||
      typeof r.at!=='string'||!Number.isFinite(Date.parse(r.at))||typeof r.signature!=='string'||r.signature.length>100000||
      typeof r.profileVersion!=='string'||typeof r.engineVersion!=='string'||
      !Array.isArray(r.errors)||r.errors.length||!Array.isArray(r.unsupported)||r.unsupported.some((v:any)=>typeof v!=='string')||
      !object(r.weights)||['payload','zfw','ramp','tow'].some(k=>typeof r.weights[k]!=='number'||!Number.isFinite(r.weights[k]))||
      ['v2','pressureAltitudeFt','headwindKt','crosswindKt','effectiveTora'].some(k=>typeof r[k]!=='number'||!Number.isFinite(r[k]))||r.v2<=0)return false;
    if(r.profileVersion===profile.profileVersion&&r.engineVersion===profile.engineVersion){
      const expected=calculate(r.input);
      if(expected.status!=='reference-only'||r.signature!==expected.signature)return false;
      for(const k of ['v2','pressureAltitudeFt','headwindKt','crosswindKt','effectiveTora'] as const)if(Math.abs(r[k]-expected[k]!)>1e-7)return false;
      if(JSON.stringify(r.weights)!==JSON.stringify(expected.weights))return false;
    }
    return true;
  }catch{return false;}
}

export function restoreStored(raw:string) {
  const saved=JSON.parse(raw);if(!object(saved))throw Error('保存内容不是对象');
  const flight=restoreDraft(saved.flight);const issues:string[]=[];
  const history:Result[]=[];
  if(!Array.isArray(saved.history)){issues.push('历史结构无效');}
  else for(const item of saved.history){if(validSavedResult(item))history.push(item);else issues.push('历史记录无效');}
  const result=saved.result&&validSavedResult(saved.result)?saved.result as Result:null;
  if(saved.result&&!result)issues.push('当前结果无效');
  const confirmed=!validate(flight).length&&saved.confirmed===signature(flight)?saved.confirmed:'';
  return {data:{flight,confirmed,result,history:history.slice(0,20),groundChanged:saved.groundChanged===true,
    revision:Number.isSafeInteger(saved.revision)&&saved.revision>=0?saved.revision:0},issues};
}
