import {Flight,weights,validate} from '../flight';
import modelParameters from './parameters.json';
import {casToTas,tasToCas,integrateForTime,integrateToSpeed,Segment} from './physics';
import {Available,Environment,Point,Solution,TakeoffOptions,TakeoffResult} from './types';

export {modelParameters};
export const MODEL_VERSION=modelParameters.version;
const P=modelParameters,C=P.constants,MODEL_SIGNATURE=JSON.stringify(P),kt=C.ktToMs;
// Pressure-height inversion has floating-point roundoff at the declared envelope endpoints.
// This tolerance is numerical (one millionth of a foot), not an extension of the model envelope.
const PRESSURE_ALTITUDE_TOLERANCE_FT = 1e-6;
const model={id:P.id,version:P.version,provenance:P.provenance};
type Configuration=typeof P.configurations['1'];
interface Candidate {solution:Solution;score:number;feasible:boolean}

export function environmentFor(f:Flight):Environment {
  const height=f.runway.elevationFt*C.ftToM;
  const pressurePa=f.weather.qnh*100*Math.pow(1-C.lapseKPerM*height/C.seaTemperatureK,C.gravity/(C.gasConstant*C.lapseKPerM));
  const temperatureK=f.weather.oat+273.15;
  const angle=(f.weather.windDir-f.runway.heading)*Math.PI/180;
  return {pressureAltitudeFt:C.seaTemperatureK/C.lapseKPerM*(1-Math.pow(pressurePa/C.seaPressurePa,C.gasConstant*C.lapseKPerM/C.gravity))/C.ftToM,
    pressurePa,temperatureK,densityKgM3:pressurePa/(C.gasConstant*temperatureK),headwindKt:f.weather.windKt*Math.cos(angle),crosswindKt:f.weather.windKt*Math.sin(angle)};
}

function evaluate(mass:number,f:Flight,env:Environment,available:Available,ratio:number,v1Kt:number,capture=false,speedStep=P.numerics.speedStepMs):Candidate|null {
  const cfg=P.configurations[String(f.flaps) as keyof typeof P.configurations] as Configuration;
  const W=mass*C.gravity,wind=env.headwindKt*kt,S=P.airframe.wingAreaM2;
  const vsTas=Math.sqrt(2*W/(env.densityKgM3*S*cfg.clMax)),vrTas=vsTas*P.speeds.vrToStall,v2Tas=vsTas*P.speeds.v2ToStall;
  const vrKt=tasToCas(vrTas,env.pressurePa,env.temperatureK)/kt,v2Kt=tasToCas(v2Tas,env.pressurePa,env.temperatureK)/kt;
  const v1Gs=casToTas(v1Kt*kt,env.pressurePa,env.temperatureK)-wind,vrGs=vrTas-wind;
  if(v1Gs<=0||v1Kt>vrKt||vrGs<=0)return null;
  const thrust=(tas:number)=>P.airframe.engineStaticThrustN*ratio*Math.pow(env.densityKgM3/C.seaDensityKgM3,P.engine.densityLapseExponent)*Math.max(P.engine.minimumSpeedFactor,1-P.engine.speedLapsePerMs*tas);
  const groundForce=(engines:number,brake=false)=>(gs:number)=>{
    const tas=Math.max(0,gs+wind),q=0.5*env.densityKgM3*tas*tas;
    const cl=brake?P.ground.brakingCl:cfg.groundCl;
    const cd=brake?P.ground.brakingCd:cfg.cd0+cfg.inducedDragK*cl*cl+(engines===1?P.engine.failedEngineDragCoefficient:0);
    const drag=q*S*cd,lift=q*S*cl,friction=(brake?P.ground.brakeFriction:P.ground.rollingFriction)*Math.max(0,W-lift);
    return (brake?0:engines*thrust(tas))-drag-friction-W*f.runway.slope/100;
  };
  const airExcess=(tas:number)=>{const q=0.5*env.densityKgM3*tas*tas,cl=W/(q*S);return thrust(tas)-q*S*(cfg.cd0+cfg.inducedDragK*cl*cl+P.engine.failedEngineDragCoefficient);};
  const gradient=airExcess(v2Tas)/W;
  if(gradient<=0)return null;
  const common=integrateToSpeed(0,v1Gs,mass,groundForce(2),speedStep,capture);
  const reaction=integrateForTime(v1Gs,P.ground.recognitionSeconds,mass,groundForce(1),P.numerics.timeStepS,capture);
  const stop=integrateToSpeed(reaction.endSpeedMs,0,mass,groundForce(0,true),speedStep,capture);
  const engineOut=integrateToSpeed(v1Gs,vrGs,mass,groundForce(1),speedStep,capture);
  const rotation=integrateForTime(vrGs,P.ground.rotationSeconds,mass,groundForce(1),P.numerics.timeStepS,capture);
  if(![common,reaction,stop,engineOut,rotation].every(s=>s.valid))return null;
  const asdM=common.distanceM+reaction.distanceM+stop.distanceM,torM=common.distanceM+engineOut.distanceM+rotation.distanceM;
  let distance=torM,time=common.timeS+engineOut.timeS+rotation.timeS,height=0,tas=rotation.endSpeedMs+wind;
  const airborne:Point[]=[];
  // Speed-domain integration uses half the positive excess force for acceleration and half for climb.
  if(tas<v2Tas){
    const count=Math.ceil((v2Tas-tas)/speedStep),dv=(v2Tas-tas)/count;
    if(count>P.numerics.maximumSteps)return null;
    for(let i=0;i<count;i++){
      const mid=tas+dv/2,excess=airExcess(mid);if(excess<=0)return null;
      const dt=mass*dv/(excess*P.climb.accelerationExcessFraction),gamma=excess/W*(1-P.climb.accelerationExcessFraction);
      time+=dt;distance+=(mid-wind)*dt;height+=mid*gamma*dt;tas+=dv;
      if(capture)airborne.push({distanceM:distance,timeS:time,speedKt:tasToCas(tas,env.pressurePa,env.temperatureK)/kt,groundSpeedKt:(tas-wind)/kt,heightM:height,phase:'oei-accelerating-climb'});
    }
  }
  const finalGradient=airExcess(tas)/W;
  if(finalGradient<=0)return null;
  if(height<P.climb.screenHeightM){
    const dt=(P.climb.screenHeightM-height)/(tas*finalGradient);time+=dt;distance+=(tas-wind)*dt;height=P.climb.screenHeightM;
  }
  const todM=distance;
  const margins={asdaM:available.asdaM-asdM,todaM:available.todaM-todM,toraM:available.toraM-torM,climbGradient:Math.min(gradient,finalGradient)-P.climb.minimumGradient};
  const factors=[{name:'ASDA 加速停止',value:asdM/available.asdaM},{name:'TODA 单发继续起飞',value:todM/available.todaM},{name:'TORA 起飞滑跑',value:torM/available.toraM},{name:'工程单发爬升梯度',value:P.climb.minimumGradient/Math.min(gradient,finalGradient)}];
  factors.sort((a,b)=>b.value-a.value);
  const solution:Solution={v1Kt,vrKt,v2Kt,thrustMode:'TOGA',assumedTemperatureC:null,thrustRatio:ratio,asdM,todM,torM,runwayLimitKg:null,limitingFactor:factors[0].name,margins,climbGradient:Math.min(gradient,finalGradient),trajectory:{accelerateStop:[],continueTakeoff:[]}};
  if(capture){
    const start:Point={distanceM:0,timeS:0,speedKt:tasToCas(Math.max(0,wind),env.pressurePa,env.temperatureK)/kt,groundSpeedKt:0,heightM:0,phase:'all-engines-acceleration'};
    const append=(target:Point[],segment:Segment,phase:string)=>{const last=target[target.length-1],offsetD=last.distanceM,offsetT=last.timeS;for(const sample of segment.samples)target.push({distanceM:offsetD+sample.distanceM,timeS:offsetT+sample.timeS,speedKt:tasToCas(Math.max(0,sample.speedMs+wind),env.pressurePa,env.temperatureK)/kt,groundSpeedKt:sample.speedMs/kt,heightM:0,phase});};
    const stopping=[start];append(stopping,common,'all-engines-acceleration');append(stopping,reaction,'engine-failure-recognition');append(stopping,stop,'dry-braking');
    const continuing=[start];append(continuing,common,'all-engines-acceleration');append(continuing,engineOut,'oei-ground-acceleration');append(continuing,rotation,'rotation');continuing.push(...airborne);
    continuing.push({distanceM:distance,timeS:time,speedKt:tasToCas(tas,env.pressurePa,env.temperatureK)/kt,groundSpeedKt:(tas-wind)/kt,heightM:height,phase:'oei-screen-and-v2'});
    const compact=(points:Point[])=>points.filter((point,i)=>i===0||i===points.length-1||point.phase!==points[i-1].phase||point.phase!==points[i+1]?.phase||i%Math.ceil(points.length/180)===0);
    solution.trajectory={accelerateStop:compact(stopping),continueTakeoff:compact(continuing)};
  }
  return {solution,score:factors[0].value,feasible:Object.values(margins).every(v=>v>=-1e-8)};
}

/** Deterministic 0.5 kt decision-speed grid; no V1 is produced by scaling V2. */
function solve(mass:number,f:Flight,env:Environment,available:Available,ratio:number,capture=false,speedStep=P.numerics.speedStepMs):Candidate|null {
  const cfg=P.configurations[String(f.flaps) as keyof typeof P.configurations];
  const vs=Math.sqrt(2*mass*C.gravity/(env.densityKgM3*P.airframe.wingAreaM2*cfg.clMax));
  const vr=tasToCas(vs*P.speeds.vrToStall,env.pressurePa,env.temperatureK)/kt;
  const low=P.speeds.minimumDecisionCasKt,high=Math.floor(vr/P.numerics.v1ResolutionKt)*P.numerics.v1ResolutionKt;
  if(high<low)return null;
  let best:Candidate|null=null;
  for(let v=low;v<=high+1e-9;v+=P.numerics.v1ResolutionKt){
    const candidate=evaluate(mass,f,env,available,ratio,v,false,speedStep);
    if(candidate&&(!best||candidate.score<best.score))best=candidate;
  }
  return best&&capture?evaluate(mass,f,env,available,ratio,best.solution.v1Kt,true,speedStep):best;
}

function massLimit(f:Flight,env:Environment,available:Available):{kg:number|null;factor:string}{
  const resolution=P.numerics.massResolutionKg;
  const minimum=Math.ceil(P.airframe.modelMinKg/resolution)*resolution,maximum=Math.floor(P.airframe.structuralMaxKg/resolution)*resolution;
  let factor='工程动力/爬升边界';
  // The VR-dependent V1 grid can create small feasible islands. Exhaustive descending
  // mass enumeration is necessary: neither bisection nor a next-bin check is complete.
  for(let mass=maximum;mass>=minimum;mass-=resolution){
    const candidate=solve(mass,f,env,available,1);
    if(candidate?.feasible)return {kg:mass,factor:mass===maximum?'结构重量上限（工程配置）':factor};
    factor=candidate?.solution.limitingFactor||'工程动力/爬升边界';
  }
  return {kg:null,factor};
}

export function calculateTakeoff(f:Flight,options:TakeoffOptions={}):TakeoffResult {
  const started=Date.now(),mode=options.mode??'FLEX',maxFlexC=options.maxFlexC??P.engine.maximumFlexC;
  const result:TakeoffResult={status:'invalid',label:P.label,at:new Date().toISOString(),input:structuredClone(f),options:{mode,maxFlexC},model,assumptions:[...P.assumptions],errors:[],warnings:[],environment:null,available:null,solution:null,
    diagnostics:{runwayLimitKg:null,limitingFactor:'',reasons:[],massResolutionKg:P.numerics.massResolutionKg,v1ResolutionKt:P.numerics.v1ResolutionKt,flexResolutionC:P.numerics.flexResolutionC,modelSignature:MODEL_SIGNATURE,elapsedMs:0}};
  const finish=()=>{result.diagnostics.elapsedMs=Date.now()-started;return result;};
  result.errors=validate(f);
  if(!['TOGA','FLEX'].includes(mode))result.errors.push('推力模式必须为 TOGA 或 FLEX');
  if(mode==='FLEX'&&(!Number.isFinite(maxFlexC)||maxFlexC<P.envelope.temperatureMinC||maxFlexC>P.engine.maximumFlexC))result.errors.push('工程假设温度上限必须为 -20 至 70°C 的有限数');
  if(result.errors.length)return finish();
  const env=environmentFor(f),A={toraM:f.runway.tora-f.runway.intersection,todaM:f.runway.toda-f.runway.intersection,asdaM:f.runway.asda-f.runway.intersection};
  result.environment=env;result.available=A;
  const envelope=P.envelope,mass=weights(f).tow;
  if(f.runway.condition!=='dry')result.errors.push('本工程模型仅支持干跑道');
  if(f.antiIce||f.packs)result.errors.push('防冰或空调引气修正未建模');
  if(mass<P.airframe.modelMinKg||mass>P.airframe.structuralMaxKg)result.errors.push('重量超出工程包线 130–251 t');
  if(env.pressureAltitudeFt<envelope.pressureAltitudeMinFt-PRESSURE_ALTITUDE_TOLERANCE_FT||env.pressureAltitudeFt>envelope.pressureAltitudeMaxFt+PRESSURE_ALTITUDE_TOLERANCE_FT)result.errors.push('压力高度超出工程包线 -1000 至 8000 ft');
  if(f.weather.oat<envelope.temperatureMinC||f.weather.oat>envelope.temperatureMaxC)result.errors.push('气温超出工程包线 -20 至 45°C');
  if(Math.abs(f.runway.slope)>envelope.slopeMaxPercent)result.errors.push('坡度超出工程包线 ±2%');
  if(env.headwindKt>envelope.headwindMaxKt+1e-8||env.headwindKt< -envelope.tailwindMaxKt-1e-8||Math.abs(env.crosswindKt)>envelope.crosswindMaxKt+1e-8)result.errors.push('风超出工程包线：迎风30 / 顺风10 / 侧风25 kt');
  if(Math.max(f.runway.tora,f.runway.toda,f.runway.asda)>envelope.maximumDeclaredDistanceM)result.errors.push('声明距离超过工程包线 6000 m');
  if(result.errors.length){result.status='unsupported';result.diagnostics.reasons=[...result.errors];return finish();}
  const limit=massLimit(f,env,A);result.diagnostics.runwayLimitKg=limit.kg;result.diagnostics.limitingFactor=limit.factor;
  const toga=solve(mass,f,env,A,1);
  if(!toga?.feasible){result.status='engineering-infeasible';result.diagnostics.reasons=[toga?`${toga.solution.limitingFactor} 超过工程阈值`:'工程动力或爬升不足，未找到有效积分解','TOGA 下未找到满足全部工程约束的 V1，禁止输出建议速度'];return finish();}
  let selected=toga,ratio=1,assumed:number|null=null;
  if(mode==='FLEX'){
    for(let temp=Math.floor(Math.min(maxFlexC,f.weather.oat+(1-P.engine.minimumFlexRatio)/P.engine.flexReductionPerC));temp>f.weather.oat;temp-=P.numerics.flexResolutionC){
      const trialRatio=Math.max(P.engine.minimumFlexRatio,1-(temp-f.weather.oat)*P.engine.flexReductionPerC),trial=solve(mass,f,env,A,trialRatio);
      if(trial?.feasible){selected=trial;ratio=trialRatio;assumed=temp;break;}
    }
    if(assumed===null)result.warnings.push('在用户温度上限及工程约束内未找到减推解，已回退至 TOGA 工程结果。');
  }
  const solution=evaluate(mass,f,env,A,ratio,selected.solution.v1Kt,true)!.solution;
  solution.thrustMode=assumed===null?'TOGA':'FLEX';solution.assumedTemperatureC=assumed;solution.runwayLimitKg=limit.kg;
  result.status='engineering-feasible';result.solution=solution;
  result.warnings.push('满足的是本项目工程模型约束，不是航空运行可起飞结论。');
  return finish();
}

/** Numerical-validation entry point: same flight/ratio/V1, different integration step only. */
export function evaluateForVerification(f:Flight,v1Kt:number,ratio=1,speedStep=P.numerics.speedStepMs){const env=environmentFor(f);return evaluate(weights(f).tow,f,env,{toraM:f.runway.tora-f.runway.intersection,todaM:f.runway.toda-f.runway.intersection,asdaM:f.runway.asda-f.runway.intersection},ratio,v1Kt,true,speedStep)?.solution??null;}

/** Complete V1 search for independent search-coverage tests; does not run massLimit. */
export function solveForVerification(f:Flight,ratio=1){const env=environmentFor(f);return solve(weights(f).tow,f,env,{toraM:f.runway.tora-f.runway.intersection,todaM:f.runway.toda-f.runway.intersection,asdaM:f.runway.asda-f.runway.intersection},ratio);}
