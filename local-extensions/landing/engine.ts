import landingParameters from './parameters.json';
import type {LandingInput,LandingContext,LandingEnvironment,LandingPoint,LandingResult,LandingSolution,LandingTarget} from './types';
export {landingParameters};
export const LANDING_MODEL_VERSION=landingParameters.version;
export const LANDING_MODEL_SIGNATURE=JSON.stringify(landingParameters);
const P=landingParameters,C=P.constants,kt=C.ktToMs;

export function defaultLandingInput(airport:string,target:LandingTarget='destination'):LandingInput {
 return {target,airport,runway:{ident:'01',headingDeg:10,ldaM:3000,elevationFt:0,slopePercent:0,condition:'dry',source:'用户录入 / 工程演示样例（非机场权威资料）'},weather:{station:airport,oatC:15,qnhHpa:1013.25,windDirDeg:10,windKt:0,gustKt:0,source:'用户录入 / 工程演示样例（非观测报文）'},configuration:'FULL',autobrake:'MED',reversers:2,approachAdditiveKt:5,distanceFactor:1.15};
}
export function landingSignature(input:LandingInput,massKg:number,context:LandingContext):string {
 return JSON.stringify({input,massKg,context,model:LANDING_MODEL_SIGNATURE});
}
export function validateLandingInput(input:LandingInput,context?:LandingContext):string[] {
 const errors:string[]=[];
 if(!input||typeof input!=='object'||Array.isArray(input))return ['着陆输入必须为对象。'];
 if(!['destination','alternate'].includes(input.target))errors.push('着陆目标须为目的地或备降场。');
 if(!/^[A-Z]{4}$/.test(input.airport||''))errors.push('着陆机场须为四位 ICAO 代码。');
 if(context){
  const expected=input.target==='alternate'?context.flight?.alternate:context.flight?.to;
  if(input.airport!==expected)errors.push('着陆机场与当前航班目的地 / 备降场不一致，请显式重设独立着陆条件。');
 }
 if(!input.runway||!input.weather)return [...errors,'缺少独立的着陆跑道或天气。'];
 if(!/^(0[1-9]|[12]\d|3[0-6])[LRC]?$/.test(input.runway.ident||''))errors.push('着陆跑道编号须为 01–36，可带 L/R/C。');
 if(input.weather.station!==input.airport)errors.push('着陆天气站与着陆机场不一致。');
 for(const source of [input.runway.source,input.weather.source])if(typeof source!=='string'||!source.trim()||source.length>300)errors.push('跑道 / 天气来源须为 1–300 字文本。');
 for(const [label,value,min,max] of [
  ['跑道航向',input.runway.headingDeg,0,360],['LDA (m)',input.runway.ldaM,1,10000],['标高 (ft)',input.runway.elevationFt,-1500,15000],['坡度 (%)',input.runway.slopePercent,-5,5],
  ['温度 (°C)',input.weather.oatC,-80,60],['QNH (hPa)',input.weather.qnhHpa,800,1100],['风向',input.weather.windDirDeg,0,360],['风速 (kt)',input.weather.windKt,0,150],['阵风 (kt)',input.weather.gustKt,0,150],
  ['手工附加速度 (kt)',input.approachAdditiveKt,0,P.approach.maximumAdditiveKt],['距离系数',input.distanceFactor,P.envelope.minimumDistanceFactor,P.envelope.maximumDistanceFactor]
 ] as const)if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)errors.push(`${label} 须为 ${min}–${max} 的有限数。`);
 if(input.weather.gustKt<input.weather.windKt)errors.push('阵风值须大于或等于稳定风速；无阵风时填相同数值。');
 if(!['FULL','CONF3'].includes(input.configuration))errors.push('着陆构型仅支持 FULL / CONF3。');
 if(!['LOW','MED','MAX'].includes(input.autobrake))errors.push('制动模式仅支持 LOW / MED / MAX。');
 if(![0,1,2].includes(input.reversers))errors.push('反推数量须为 0、1、2。');
 if(!['dry','wet','contaminated'].includes(input.runway.condition))errors.push('跑道状态无效。');
 return errors;
}
export function landingEnvironment(input:LandingInput):LandingEnvironment {
 const h=input.runway.elevationFt*C.ftToM;
 const pressurePa=input.weather.qnhHpa*100*Math.pow(1-C.lapseKPerM*h/C.seaTemperatureK,C.gravity/(C.gasConstant*C.lapseKPerM));
 const temperatureK=input.weather.oatC+273.15,angle=(input.weather.windDirDeg-input.runway.headingDeg)*Math.PI/180;
 return {pressurePa,temperatureK,densityKgM3:pressurePa/(C.gasConstant*temperatureK),pressureAltitudeFt:C.seaTemperatureK/C.lapseKPerM*(1-Math.pow(pressurePa/C.seaPressurePa,C.gasConstant*C.lapseKPerM/C.gravity))/C.ftToM,headwindKt:input.weather.windKt*Math.cos(angle),crosswindKt:input.weather.windKt*Math.sin(angle)};
}
function tasToCas(tas:number,env:LandingEnvironment):number {
 const mach=tas/Math.sqrt(C.gamma*C.gasConstant*env.temperatureK),qc=env.pressurePa*(Math.pow(1+(C.gamma-1)/2*mach*mach,C.gamma/(C.gamma-1))-1);
 return Math.sqrt(C.gamma*C.gasConstant*C.seaTemperatureK)*Math.sqrt(2/(C.gamma-1)*(Math.pow(qc/C.seaPressurePa+1,(C.gamma-1)/C.gamma)-1));
}
function casToTas(cas:number,env:LandingEnvironment):number {
 const a0=Math.sqrt(C.gamma*C.gasConstant*C.seaTemperatureK),qc=C.seaPressurePa*(Math.pow(1+(C.gamma-1)/2*(cas/a0)**2,C.gamma/(C.gamma-1))-1);
 return Math.sqrt(2/(C.gamma-1)*(Math.pow(qc/env.pressurePa+1,(C.gamma-1)/C.gamma)-1))*Math.sqrt(C.gamma*C.gasConstant*env.temperatureK);
}
function solutionAt(input:LandingInput,massKg:number,env:LandingEnvironment,capture:boolean):LandingSolution|null {
 const cfg=P.configurations[input.configuration],wind=env.headwindKt*kt,W=massKg*C.gravity;
 const vs=Math.sqrt(2*W/(env.densityKgM3*P.airframe.wingAreaM2*cfg.clMax));
 const vrefKt=tasToCas(vs*P.approach.vrefToStall,env)/kt;
 const additiveKt=Math.max(input.approachAdditiveKt,P.approach.minimumAdditiveKt,Math.max(0,env.headwindKt)*P.approach.headwindAdditiveRatio,input.weather.gustKt-input.weather.windKt);
 const vappKt=vrefKt+additiveKt,vappTas=casToTas(vappKt*kt,env),touchdownTas=vappTas*P.approach.touchdownTasRatio,touchdownGs=touchdownTas-wind;
 const approachTime=(P.approach.screenHeightM-P.approach.flareHeightM)/(vappTas*Math.sin(P.approach.pathAngleDeg*Math.PI/180));
 const approachDistance=(vappTas*Math.cos(P.approach.pathAngleDeg*Math.PI/180)-wind)*approachTime;
 const flareDistance=((vappTas+touchdownTas)/2-wind)*P.approach.flareSeconds;
 const airDistanceM=approachDistance+flareDistance,airTime=approachTime+P.approach.flareSeconds,delayDistanceM=touchdownGs*P.ground.delaySeconds;
 const trajectory:LandingPoint[]=capture?[{distanceM:0,timeS:0,groundSpeedKt:(vappTas-wind)/kt,heightM:P.approach.screenHeightM,phase:'approach'},{distanceM:approachDistance,timeS:approachTime,groundSpeedKt:(vappTas-wind)/kt,heightM:P.approach.flareHeightM,phase:'flare'},{distanceM:airDistanceM,timeS:airTime,groundSpeedKt:touchdownGs/kt,heightM:0,phase:'delay'},{distanceM:airDistanceM+delayDistanceM,timeS:airTime+P.ground.delaySeconds,groundSpeedKt:touchdownGs/kt,heightM:0,phase:'braking'}]:[];
 const mu=input.runway.condition==='wet'?P.ground.wetFriction:P.ground.dryFriction,desired=P.ground.autobrakeDecelerationMs2[input.autobrake];
 const count=Math.ceil(touchdownGs/P.numerics.speedStepMs);if(count<1||count>P.numerics.maximumSteps)return null;
 const dv=touchdownGs/count;let brakingDistanceM=0,brakingSeconds=0;
 for(let i=0;i<count;i++){
  const gs=touchdownGs-(i+0.5)*dv,tas=Math.max(0,gs+wind),q=0.5*env.densityKgM3*tas*tas;
  const drag=q*P.airframe.wingAreaM2*cfg.brakingCd,lift=q*P.airframe.wingAreaM2*P.ground.brakingCl;
  const reverse=input.reversers*P.ground.reverseForcePerEngineN*Math.min(1,gs/P.ground.reverseFullAboveGroundSpeedMs),slope=W*input.runway.slopePercent/100;
  const passive=drag+reverse+slope,wheel=Math.min(mu*Math.max(0,W-lift),Math.max(0,massKg*desired-passive));
  const force=passive+wheel;if(!Number.isFinite(force)||force<=0)return null;
  const dt=massKg*dv/force;brakingDistanceM+=gs*dt;brakingSeconds+=dt;
  if(capture&&(i%Math.max(1,Math.ceil(count/90))===0||i===count-1))trajectory.push({distanceM:airDistanceM+delayDistanceM+brakingDistanceM,timeS:airTime+P.ground.delaySeconds+brakingSeconds,groundSpeedKt:Math.max(0,touchdownGs-(i+1)*dv)/kt,heightM:0,phase:'braking'});
 }
 const unfactoredDistanceM=airDistanceM+delayDistanceM+brakingDistanceM,requiredDistanceM=unfactoredDistanceM*input.distanceFactor,marginM=input.runway.ldaM-requiredDistanceM;
 return {massKg,vrefKt,vappKt,additiveKt,touchdownGroundSpeedKt:touchdownGs/kt,airDistanceM,delayDistanceM,brakingDistanceM,unfactoredDistanceM,requiredDistanceM,marginM,marginPercent:marginM/input.runway.ldaM*100,stopTimeS:airTime+P.ground.delaySeconds+brakingSeconds,fieldLimitKg:null,limitReason:'',trajectory};
}

export function calculateLanding(input:LandingInput,massKg:number,context:LandingContext):LandingResult {
 const result:LandingResult={status:'invalid',label:P.label,at:new Date().toISOString(),model:{id:P.id,version:P.version,signature:LANDING_MODEL_SIGNATURE,provenance:P.provenance},input:structuredClone(input),massKg,context:structuredClone(context),signature:landingSignature(input,massKg,context),errors:[],warnings:['飞机专用系数、速度和距离均为工程假设，不能作为实际着陆或签派依据。'],environment:null,solution:null,diagnostics:{fieldLimitKg:null,limitReason:'未求解',massResolutionKg:P.numerics.massResolutionKg}};
 result.errors=validateLandingInput(input,context);
 if(typeof massKg!=='number'||!Number.isFinite(massKg)||massKg<=0)result.errors.push('着陆重量须为正有限数 (kg)。');
 if(!context||!context.flight||typeof context.flight.id!=='string'||!context.flight.id||!['massSource','massSignature','workflowSignature'].every(key=>typeof context[key as keyof LandingContext]==='string'&&String(context[key as keyof LandingContext]).length>0))result.errors.push('缺少当前航班、重量来源或工作流签名。');
 if(result.errors.length)return result;
 const env=landingEnvironment(input);result.environment=env;
 const E=P.envelope,angle=(input.weather.windDirDeg-input.runway.headingDeg)*Math.PI/180,gustHead=input.weather.gustKt*Math.cos(angle),gustCross=input.weather.gustKt*Math.sin(angle);
 if(input.runway.condition==='contaminated')result.errors.push('污染跑道未建模；本工程模型仅支持干 / 湿跑道。');
 if(massKg<P.airframe.modelMinKg||massKg>P.airframe.modelMaxKg)result.errors.push(`重量超出 ${P.airframe.modelMinKg}–${P.airframe.modelMaxKg} kg 工程包线。`);
 if(env.pressureAltitudeFt<E.pressureAltitudeMinFt-1e-6||env.pressureAltitudeFt>E.pressureAltitudeMaxFt+1e-6)result.errors.push('压力高度超出 −1000–8000 ft 工程包线。');
 if(input.weather.oatC<E.temperatureMinC||input.weather.oatC>E.temperatureMaxC)result.errors.push('温度超出 −20–45 °C 工程包线。');
 if(Math.abs(input.runway.slopePercent)>E.maximumSlopePercent)result.errors.push('跑道坡度超出 ±2% 工程包线。');
 if(input.runway.ldaM<E.minimumLdaM||input.runway.ldaM>E.maximumLdaM)result.errors.push('LDA 超出 300–6000 m 工程包线。');
 if(Math.max(env.headwindKt,gustHead)>E.maximumHeadwindKt+1e-8||Math.min(env.headwindKt,gustHead)<-E.maximumTailwindKt-1e-8)result.errors.push('稳定风或阵风的纵向分量超出迎风 30 kt / 顺风 10 kt 工程包线。');
 if(Math.max(Math.abs(env.crosswindKt),Math.abs(gustCross))>E.maximumCrosswindKt+1e-8)result.errors.push('稳定风或阵风的侧风分量超出 25 kt 工程包线。');
 if(input.weather.gustKt-input.weather.windKt>P.approach.maximumAdditiveKt)result.errors.push('阵风增量要求附加速度大于 20 kt，超出工程模型。');
 if(result.errors.length){result.status='unsupported';return result;}
 const solution=solutionAt(input,massKg,env,true);
 if(!solution){result.errors.push('未找到可收敛的工程减速解。');return result;}
 // Exhaustive finite mass grid avoids depending on an assumed monotonicity of the brake controller.
 let fieldLimitKg:number|null=null;
 for(let mass=P.airframe.modelMinKg;mass<=P.airframe.modelMaxKg;mass+=P.numerics.massResolutionKg){const candidate=solutionAt(input,mass,env,false);if(candidate&&candidate.marginM>=0)fieldLimitKg=mass;}
 const limitReason=fieldLimitKg===null?'模型最低质量仍不满足 LDA':fieldLimitKg===P.airframe.modelMaxKg?'达到工程质量包线上限（非结构审定限值）':'LDA 可用着陆距离';
 result.diagnostics={fieldLimitKg,limitReason,massResolutionKg:P.numerics.massResolutionKg};solution.fieldLimitKg=fieldLimitKg;solution.limitReason=limitReason;
 if(solution.marginM<0)result.warnings.push(`工程所需距离超过 LDA ${Math.round(-solution.marginM)} m；下列速度仅为不可行状态的诊断值。`);
 result.solution=solution;result.status=solution.marginM>=0?'engineering-feasible':'engineering-infeasible';
 return result;
}
