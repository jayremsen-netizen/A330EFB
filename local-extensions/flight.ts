import profile from './data/a339-reference.json';
import {FUEL_CAPACITY_GALLONS,FUEL_KG_PER_GALLON} from './fuel';
import {planningShapeErrors} from './planning-schema';
import type {PlanningInputs} from './planning-schema';
export {profile};
export interface Flight {
 schemaVersion:1;profileId:string;id:string;number:string;date:string;from:string;to:string;alternate:string;route:string;source:string;
 pax:number;paxKg:number;bagKg:number;freightKg:number;oewKg:number;rampKg:number;taxiKg:number;
 runway:{ident:string;heading:number;tora:number;toda:number;asda:number;elevationFt:number;slope:number;condition:string;intersection:number;source:string};
 weather:{windDir:number;windKt:number;oat:number;qnh:number;source?:string;observedAt?:string;station?:string;supersededSource?:string};flaps:number;antiIce:boolean;packs:boolean;
 departureReview?:{airport:string;previousAirport:string;weather:boolean;runway:boolean};
 planning?:PlanningInputs;
}
export const example=():Flight=>({schemaVersion:1,profileId:profile.profileId,id:'LOCAL-DEMO-330',number:'DEMO330',date:'2026-10-03',from:'ZUTF',to:'ZSPD',alternate:'ZSSS',route:'ZUTF DCT ZSPD - LOCAL SAMPLE',source:'local-example',pax:250,paxKg:80,bagKg:24,freightKg:2000,oewKg:127000,rampKg:30000,taxiKg:500,runway:{ident:'01',heading:10,tora:3500,toda:3500,asda:3500,elevationFt:1450,slope:0,condition:'dry',intersection:0,source:'手动示例，非机场权威数据'},weather:{windDir:10,windKt:0,oat:15,qnh:1013.25},flaps:1,antiIce:false,packs:false});
export const weights=(f:Flight)=>{const payload=f.pax*(f.paxKg+f.bagKg)+f.freightKg;const zfw=f.oewKg+payload;return {payload,zfw,ramp:zfw+f.rampKg,tow:zfw+f.rampKg-f.taxiKg};};
export function validate(f:any):string[]{
 const e:string[]=[];
 if(!f||typeof f!=='object'||Array.isArray(f))return ['航班文件必须是 JSON 对象'];
 if(f.schemaVersion!==1)e.push('不支持的 schemaVersion');if(f.profileId!==profile.profileId)e.push('机型必须为 A330-941 / Trent 7000');
 e.push(...planningShapeErrors(f.planning));
 for(const k of ['id','number','date','from','to','alternate','route','source'])if(typeof f[k]!=='string'||f[k].length>500)e.push(k+' 必须是有长度限制的文本');
 for(const k of ['id','number'])if(typeof f[k]==='string'&&!f[k].trim())e.push(k+' 不能为空');
 for(const k of ['from','to'])if(!/^[A-Z]{4}$/.test(f[k]||''))e.push(k+' 必须为四位 ICAO 代码');
 const parsedDate = new Date(f.date);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(f.date||'')||!Number.isFinite(parsedDate.getTime())||parsedDate.toISOString().slice(0,10)!==f.date)e.push('航班日期无效');
 if(f.alternate && !/^[A-Z]{4}$/.test(f.alternate))e.push('备降机场必须为四位 ICAO 代码或留空');
 for(const k of ['pax','paxKg','bagKg','freightKg','oewKg','rampKg','taxiKg'])if(typeof f[k]!=='number'||!Number.isFinite(f[k])||f[k]<0)e.push(k+' 必须为非负有限数');
 if(!f.runway||!f.weather)return [...e,'缺少跑道或天气对象'];
 for(const [obj,keys] of [[f.runway,['heading','tora','toda','asda','elevationFt','slope','intersection']],[f.weather,['windDir','windKt','oat','qnh']]] as any)for(const k of keys)if(typeof obj[k]!=='number'||!Number.isFinite(obj[k]))e.push(k+' 必须为有限数');
 if(![1,2,3].includes(f.flaps))e.push('襟翼仅接受 1、2、3');
 if(typeof f.antiIce!=='boolean'||typeof f.packs!=='boolean')e.push('防冰和引气必须为布尔值');
 if(typeof f.runway.ident!=='string'||!/^(0[1-9]|[12]\d|3[0-6])[LRC]?$/.test(f.runway.ident))e.push('跑道编号必须为 01–36，可带 L、R、C');
 for(const key of ['source','observedAt','station','supersededSource'])if(f.weather[key]!==undefined&&(typeof f.weather[key]!=='string'||f.weather[key].length>300))e.push('天气来源字段无效');
 if(f.weather.station!==undefined&&(!/^[A-Z]{4}$/.test(f.weather.station)||f.weather.station!==f.from))e.push('天气站点与起飞机场不一致，请重新采用对应机场天气，或明确复核为本机场手工条件');
 if(f.departureReview!==undefined){const r=f.departureReview;if(!r||typeof r!=='object'||Array.isArray(r)||typeof r.airport!=='string'||typeof r.previousAirport!=='string'||r.airport.length>500||r.previousAirport.length>500||typeof r.weather!=='boolean'||typeof r.runway!=='boolean')e.push('起飞机场资料复核状态无效');else{if(r.airport!==f.from||!r.weather)e.push('起飞机场天气待复核');if(r.airport!==f.from||!r.runway)e.push('起飞机场跑道资料待复核');}}
 if(typeof f.runway.source!=='string'||f.runway.source.length>300)e.push('跑道来源文本无效');
 if(!['dry','wet','contaminated'].includes(f.runway.condition))e.push('跑道条件无效');
 if(e.length)return e;
 if(!Number.isInteger(f.pax)||f.pax>436)e.push('旅客人数需为 0–436 的整数');
 if(f.paxKg<1||f.paxKg>200||f.bagKg>100)e.push('单人或行李重量超出录入范围');
 if(f.pax*f.bagKg+f.freightKg>44836)e.push('行李与额外货物合计超过货舱容量 44836 kg');
 if(f.oewKg!==profile.oewKg)e.push('本机型包固定 OEW 为 127000 kg，修改需另建配置版本');
 if(f.taxiKg>f.rampKg)e.push('滑行耗油不能大于停机坪燃油');
 if(f.rampKg>FUEL_CAPACITY_GALLONS*FUEL_KG_PER_GALLON)e.push('停机坪燃油超过机型配置上限 111661.977 kg');
 if(f.runway.tora<=0||f.runway.tora>10000||f.runway.toda<f.runway.tora||f.runway.asda<f.runway.tora)e.push('要求 0 < TORA ≤ 10000 m，TODA / ASDA 不小于 TORA');
 if(f.runway.intersection<0||f.runway.intersection>=f.runway.tora)e.push('进跑道距离扣减必须小于 TORA');
 if(f.runway.heading<0||f.runway.heading>360||f.weather.windDir<0||f.weather.windDir>360)e.push('方向必须为 0–360°');
 if(f.weather.windKt<0||f.weather.windKt>150||f.weather.qnh<800||f.weather.qnh>1100||f.weather.oat< -80||f.weather.oat>60)e.push('气象录入超出本地输入范围');
 if(f.runway.elevationFt< -1500||f.runway.elevationFt>15000||Math.abs(f.runway.slope)>5)e.push('标高或坡度超出录入范围');
 const w=weights(f);if(w.zfw>profile.maxZfwKg)e.push('ZFW 超过 181000 kg 结构配置值');if(w.tow>profile.structuralMtowKg)e.push('TOW 超过 251000 kg 结构配置值');
 return e;
}
export function parseFlight(text:string):Flight{if(new TextEncoder().encode(text).length>524288)throw Error('文件超过 512 KB 限制');const f=JSON.parse(text);const e=validate(f);if(e.length)throw Error(e.join('；'));return f;}
export const signature=(f:Flight)=>JSON.stringify({f,profile,engine:profile.engineVersion});
export function calculate(f:Flight){
 const errors=validate(f);const sig=signature(f);const base={at:new Date().toISOString(),signature:sig,input:structuredClone(f),profileVersion:profile.profileVersion,engineVersion:profile.engineVersion,errors,unsupported:profile.unsupported,v2:null as number|null,pressureAltitudeFt:null as number|null,headwindKt:null as number|null,crosswindKt:null as number|null,effectiveTora:null as number|null,weights:errors.length?null:weights(f),status:'invalid'};
 if(errors.length)return base;
 const w=weights(f);const angle=(f.weather.windDir-f.runway.heading)*Math.PI/180;
 base.pressureAltitudeFt=f.runway.elevationFt+145442.15*(1-(f.weather.qnh/1013.25)**0.190263);base.headwindKt=f.weather.windKt*Math.cos(angle);base.crosswindKt=f.weather.windKt*Math.sin(angle);base.effectiveTora=f.runway.tora-f.runway.intersection;
 if(w.tow<profile.massMin||w.tow>profile.massMax){base.status='unsupported';base.errors.push('TOW 超出速度参考表 130000–250000 kg 范围，禁止外推');return base;}
 if(f.runway.condition!=='dry'){base.status='unsupported';base.errors.push('湿或污染跑道修正无可靠数据，本版本不输出速度参考');return base;}
 if(f.antiIce||f.packs){base.status='unsupported';base.errors.push('防冰 / 引气修正未建模，本版本不输出速度参考');return base;}
 if(f.flaps===3&&w.tow>=220000&&w.tow<=230000){base.status='unsupported';base.errors.push('CONF 3 在 220–230 t 的源码表存在跳变，资料核验前不输出参考值');return base;}
 const i=(w.tow-profile.massMin)/profile.step;const lo=Math.floor(i),hi=Math.min(12,lo+1);const table=profile.v2[String(f.flaps) as keyof typeof profile.v2];base.v2=table[lo]+(table[hi]-table[lo])*(i-lo);base.status='reference-only';return base;
}
export const massConvert=(v:number,from:'kg'|'lb',to:'kg'|'lb')=>from===to?v:from==='kg'?v/0.45359237:v*0.45359237;
export const lengthConvert=(v:number,from:'m'|'ft',to:'m'|'ft')=>from===to?v:from==='m'?v/0.3048:v*0.3048;
export const pressureConvert=(v:number,from:'hPa'|'inHg',to:'hPa'|'inHg')=>from===to?v:from==='hPa'?v/33.8638866667:v*33.8638866667;
