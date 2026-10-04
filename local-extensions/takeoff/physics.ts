import parameters from './parameters.json';
const C=parameters.constants;
export interface Segment {distanceM:number;timeS:number;endSpeedMs:number;valid:boolean;samples:{distanceM:number;timeS:number;speedMs:number}[]}

/** Midpoint quadrature in speed; constant force has an exact distance integral. */
export function integrateToSpeed(start:number,end:number,mass:number,force:(speed:number)=>number,step=parameters.numerics.speedStepMs,capture=false):Segment {
  const result:Segment={distanceM:0,timeS:0,endSpeedMs:start,valid:true,samples:[]};
  if(![start,end,mass,step].every(Number.isFinite)||start<0||end<0||mass<=0||step<=0){result.valid=false;return result;}
  const count=Math.ceil(Math.abs(end-start)/step);
  if(count>parameters.numerics.maximumSteps){result.valid=false;return result;}
  if(!count)return result;
  const dv=(end-start)/count;
  for(let i=0;i<count;i++){
    const mid=start+(i+0.5)*dv,f=force(mid);
    if(!Number.isFinite(f)||f*dv<=0){result.valid=false;return result;}
    const dt=mass*dv/f;
    result.distanceM+=mid*dt;result.timeS+=dt;result.endSpeedMs=start+(i+1)*dv;
    if(result.timeS>600||result.distanceM>50000){result.valid=false;return result;}
    if(capture)result.samples.push({distanceM:result.distanceM,timeS:result.timeS,speedMs:result.endSpeedMs});
  }
  return result;
}

/** Midpoint time integration for reaction/rotation with their own single duration. */
export function integrateForTime(start:number,seconds:number,mass:number,force:(speed:number)=>number,step=parameters.numerics.timeStepS,capture=false):Segment {
  const result:Segment={distanceM:0,timeS:0,endSpeedMs:start,valid:true,samples:[]};
  if(![start,seconds,mass,step].every(Number.isFinite)||start<0||seconds<0||mass<=0||step<=0){result.valid=false;return result;}
  const count=Math.ceil(seconds/step);if(count>parameters.numerics.maximumSteps){result.valid=false;return result;}if(!count)return result;
  const dt=seconds/count;
  for(let i=0;i<count;i++){
    const a=force(result.endSpeedMs)/mass,mid=result.endSpeedMs+a*dt/2,b=force(mid)/mass,next=result.endSpeedMs+b*dt;
    if(!Number.isFinite(next)||mid<0||next<0){result.valid=false;return result;}
    result.distanceM+=mid*dt;result.timeS+=dt;result.endSpeedMs=next;
    if(capture)result.samples.push({distanceM:result.distanceM,timeS:result.timeS,speedMs:next});
  }
  return result;
}

export function casToTas(casMs:number,pressurePa:number,temperatureK:number):number {
  const a0=Math.sqrt(C.gamma*C.gasConstant*C.seaTemperatureK),qc=C.seaPressurePa*(Math.pow(1+(C.gamma-1)/2*(casMs/a0)**2,C.gamma/(C.gamma-1))-1);
  const mach=Math.sqrt(2/(C.gamma-1)*(Math.pow(qc/pressurePa+1,(C.gamma-1)/C.gamma)-1));
  return mach*Math.sqrt(C.gamma*C.gasConstant*temperatureK);
}
export function tasToCas(tasMs:number,pressurePa:number,temperatureK:number):number {
  const mach=tasMs/Math.sqrt(C.gamma*C.gasConstant*temperatureK),qc=pressurePa*(Math.pow(1+(C.gamma-1)/2*mach**2,C.gamma/(C.gamma-1))-1);
  return Math.sqrt(C.gamma*C.gasConstant*C.seaTemperatureK)*Math.sqrt(2/(C.gamma-1)*(Math.pow(qc/C.seaPressurePa+1,(C.gamma-1)/C.gamma)-1));
}
