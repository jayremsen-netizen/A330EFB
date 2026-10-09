import {Flight,signature,validate} from './flight';
import type {Command,CommandKind,RuntimeState} from './demo-runtime';

export interface CommandPlan {
 flightId:string;flightNumber:string;planSignature:string;version:string;operationSignature:string;
 fuelTargetKg?:number;paxTarget?:number;cargoTargetKg?:number;warnings?:string[];
}
function operationSignature(f:Flight,kind:CommandKind):string {
 const targets=kind==='refuel'?{fuelKg:f.rampKg}:kind==='board'?{pax:f.pax,paxKg:f.paxKg,cargoKg:f.pax*f.bagKg+f.freightKg}:{};
 return JSON.stringify({flightId:f.id,kind,...targets});
}
export function commandPlan(f:Flight,kind:CommandKind):CommandPlan {
 const planSignature=signature(f);let hash=2166136261;for(const ch of planSignature)hash=Math.imul(hash^ch.charCodeAt(0),16777619);
 return {flightId:f.id,flightNumber:f.number,planSignature,version:(hash>>>0).toString(16).padStart(8,'0'),operationSignature:operationSignature(f,kind),
  ...(kind==='refuel'?{fuelTargetKg:f.rampKg}:kind==='board'?{paxTarget:f.pax,cargoTargetKg:f.pax*f.bagKg+f.freightKg}:{})};
}
/** Only the operation's own targets determine whether an issued command uses an old plan. */
export function commandUsesOldPlan(c:Command,f:Flight):boolean {
 return !!c.plan&&c.plan.operationSignature!==operationSignature(f,c.kind);
}
export function groundPreparation(f:Flight,s:RuntimeState,confirmed:boolean) {
 const fuelDifferenceKg=s.fuelKg-f.rampKg,paxDifference=s.pax-f.pax,cargoDifferenceKg=s.cargoKg-(f.pax*f.bagKg+f.freightKg);
 const planConfirmed=confirmed&&validate(f).length===0;
 const loaded=[fuelDifferenceKg,paxDifference,cargoDifferenceKg].every(Number.isFinite)&&Math.abs(fuelDifferenceKg)<.01&&paxDifference===0&&Math.abs(cargoDifferenceKg)<.01;
 const issues:string[]=[];
 if(!planConfirmed)issues.push('当前计划未确认或输入无效');
 if(!loaded)issues.push('实际燃油、人数或货物与当前计划有差额');
 if(s.commands.some(c=>['accepted','running'].includes(c.status)))issues.push('地面操作仍在执行');
 if(s.faults.length)issues.push('存在活动设备故障');
 if(s.pushbackMetres>0)issues.push('已离开停机位');
 return {planConfirmed,loaded,ready:issues.length===0,fuelDifferenceKg,paxDifference,cargoDifferenceKg,issues};
}
