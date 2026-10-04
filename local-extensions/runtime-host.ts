import {DemoRuntime,CommandKind,Fault} from './demo-runtime';
import {Flight,signature,validate,example} from './flight';
import {fuelVariables} from './fuel';

const model=new DemoRuntime(),listeners=new Set<()=>void>();
let plan:Flight=example(),engaged=false,serial=0,initialized=false;
const seats=[36,36,39,48,45,45,45,45,45,52];
const cargo=[['FWD_BAGGAGE_CONTAINER',5800],['AFT_CONTAINER',17061],['AFT_BAGGAGE',18507],['AFT_BULK_LOOSE',3468]] as const;
function publish(){
 const s=model.snapshot(),host=(window as any).__LOCAL_EFB__;
 if(host){
  const loadedCargo=s.cargoKg;
  const zfw=plan.oewKg+s.pax*plan.paxKg+loadedCargo;
  const vars={...fuelVariables(s.fuelKg),'TOTAL WEIGHT':zfw+s.fuelKg,'L:A32NX_AIRFRAME_ZFW':zfw,'L:A32NX_AIRFRAME_GW':zfw+s.fuelKg,'L:A32NX_FM_GROSS_WEIGHT':zfw+s.fuelKg,'L:A32NX_FM_ZFW':zfw,'EXTERNAL POWER AVAILABLE:1':Number(s.gpuConnected),'EXTERNAL POWER ON:1':Number(s.gpuConnected),'L:A32NX_REFUEL_STARTED_BY_USR':Number(s.commands.some(c=>c.kind==='refuel'&&['accepted','running'].includes(c.status))),'L:A32NX_BOARDING_STARTED_BY_USR':Number(s.commands.some(c=>(c.kind==='board'||c.kind==='deboard')&&['accepted','running'].includes(c.status)))};
  Object.entries(vars).forEach(([k,v])=>host.set(k,v));
  let left=s.pax;seats.forEach((capacity,i)=>{const n=Math.min(left,capacity);left-=n;host.set('L:A32NX_PAX_'+String.fromCharCode(65+i),Number((1n<<BigInt(n))-1n));});
  cargo.forEach(([name,capacity])=>host.set('L:A32NX_CARGO_'+name,loadedCargo*capacity/44836));
 }
 listeners.forEach(f=>f());
}
function readyPlan(){const s=(window as any).__LOCAL_FLIGHT__?.getState();if(!s||s.storageConflict||s.groundChanged||s.confirmed!==signature(s.flight)||validate(s.flight).length)throw Error('请先核对并确认当前航班与地面目标');return s.flight as Flight;}
export const runtime={
 snapshot:()=>model.snapshot(),
 subscribe:(f:()=>void)=>{listeners.add(f);return()=>{listeners.delete(f);};},
 command:(kind:CommandKind,id?:string)=>{engaged=true;if(kind==='refuel'||kind==='board')plan=structuredClone(readyPlan());const receipt=model.submit(id||'command-'+(++serial),kind,kind==='refuel'?plan.rampKg:kind==='board'?plan.pax:undefined,Date.now(),undefined,plan.pax*plan.bagKg+plan.freightKg);publish();return receipt;},
 fault:(kind:Fault,on:boolean)=>{engaged=true;model.fault(kind,on);publish();},
 cancel:()=>{model.cancel();publish();},
 preset:(name:'parked'|'prepared')=>{engaged=true;if(name==='prepared')plan=structuredClone(readyPlan());model.reset(name==='prepared',name==='prepared'?plan.rampKg:5000,name==='prepared'?plan.pax:0,Date.now(),name==='prepared'?plan.pax*plan.bagKg+plan.freightKg:0);publish();},
 startFlight:(f:Flight)=>{engaged=true;plan=structuredClone(f);model.reset(false,5000,0,Date.now(),0);const host=(window as any).__LOCAL_EFB__;if(host){for(const key of host.vars.keys())if(/^L:A32NX_(PAX_|CARGO_).*_DESIRED$/.test(key))host.set(key,0);for(const [key,value] of Object.entries({'L:A32NX_FUEL_DESIRED':5000,'L:A32NX_AIRFRAME_ZFW_DESIRED':f.oewKg,'L:A32NX_AIRFRAME_GW_DESIRED':f.oewKg+5000,'L:A32NX_WB_PER_PAX_WEIGHT':f.paxKg,'L:A32NX_WB_PER_BAG_WEIGHT':f.bagKg}))host.set(key,value);}publish();},
 setPlan:(f:Flight)=>{plan=structuredClone(f);if(f.planning){engaged=true;publish();return;}if(!engaged){model.reset(false,f.rampKg,f.pax,Date.now(),f.pax*f.bagKg+f.freightKg);publish();}},
};
export function initializeRuntime(){if(initialized)return;initialized=true;(window as any).__LOCAL_RUNTIME__=runtime;publish();setInterval(()=>{if(model.tick())publish();},100);}
