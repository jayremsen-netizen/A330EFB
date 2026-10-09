import {FUEL_CAPACITY_GALLONS,FUEL_KG_PER_GALLON} from './fuel';
import type {CommandPlan} from './ground-plan';

export type CommandKind='gpu-connect'|'gpu-disconnect'|'refuel'|'board'|'deboard'|'pushback';
export type CommandStatus='accepted'|'running'|'completed'|'rejected'|'failed';
export type Fault='gpu'|'refuel';
export type Command={id:string;session:number;kind:CommandKind;status:CommandStatus;message:string;progress:number;at:number;startedAt?:number;target?:number;start?:number;cargoTarget?:number;cargoStart?:number;plan?:CommandPlan};
export type RuntimeState={session:number;revision:number;sampledAt:number;gpuConnected:boolean;fuelKg:number;pax:number;cargoKg:number;pushbackMetres:number;faults:Fault[];commands:Command[]};
const active=(c:Command)=>c.status==='accepted'||c.status==='running';
const duration:Record<CommandKind,number>={'gpu-connect':1200,'gpu-disconnect':900,refuel:3000,board:3000,deboard:3000,pushback:2500};

/** A deterministic demonstration model. No aircraft SDK or external service is used. */
export class DemoRuntime {
 private state:RuntimeState={session:1,revision:0,sampledAt:0,gpuConnected:false,fuelKg:5000,pax:0,cargoKg:0,pushbackMetres:0,faults:[],commands:[]};
 private receipts=new Map<string,Command>();
 snapshot(){return structuredClone(this.state);}
 private changed(now:number){this.state.revision++;this.state.sampledAt=now;}
 submit(id:string,kind:CommandKind,target?:number,now=Date.now(),session=this.state.session,cargoTarget=0,plan?:CommandPlan):Command {
  if(session!==this.state.session)return {id,session,kind,target,at:now,status:'rejected',progress:0,message:'演示会话已重置，请重新发出请求'};
  const old=this.receipts.get(id);if(old)return structuredClone(old);
  const c:Command={id,session,kind,target,cargoTarget,at:now,status:'accepted',progress:0,message:'请求已受理',...(plan?{plan:structuredClone(plan)}:{})};
  if(kind==='deboard'){c.target=0;c.cargoTarget=0;}
  const reject=(message:string)=>{c.status='rejected';c.message=message;};
  const busy=this.state.commands.filter(active);
  if(!Object.hasOwn(duration,kind)||!id||this.receipts.size>=1000)reject('请求无效或已达到会话上限，请重置场景');
  else if(busy.length)reject('上一项地面操作尚未结束');
  else if((kind==='gpu-connect'&&this.state.faults.includes('gpu'))||(kind==='refuel'&&this.state.faults.includes('refuel')))reject('相关设备故障尚未解除');
  else if(kind==='pushback'&&this.state.gpuConnected)reject('请先断开外接电源，再请求推出');
  else if(this.state.pushbackMetres>0&&kind!=='pushback')reject('已离开停机位，请恢复停机预设后操作');
  else if(kind==='pushback'&&this.state.pushbackMetres>0)reject('本次推出已完成，请恢复停机预设后重试');
  else if(kind==='refuel'&&(!Number.isFinite(target)||target!<0||target!>FUEL_CAPACITY_GALLONS*FUEL_KG_PER_GALLON))reject('加油目标超出容量');
  else if(kind==='board'&&(!Number.isInteger(target)||target!<0||target!>436||!Number.isFinite(cargoTarget)||cargoTarget<0||cargoTarget>44836))reject('旅客人数或货舱目标无效');
  else if(kind==='deboard'&&this.state.pax===0&&this.state.cargoKg===0)reject('当前已无旅客和货物，无需重复下客');
  if(this.receipts.size<1000){this.receipts.set(id,c);this.state.commands=[c,...this.state.commands].slice(0,100);this.changed(now);}
  return structuredClone(c);
 }
 tick(now=Date.now()) {
  const c=this.state.commands.find(active);if(!c)return false;
  if(c.status==='accepted'){c.status='running';c.startedAt=now;c.start=c.kind==='refuel'?this.state.fuelKg:(c.kind==='board'||c.kind==='deboard')?this.state.pax:0;c.cargoStart=this.state.cargoKg;c.message=c.kind==='deboard'?'正在下客并卸载货物；航班计划保持不变':'本地仿真正在执行';}
  c.progress=Math.max(c.progress,Math.min(1,Math.max(0,now-c.startedAt!)/duration[c.kind]));
  if(c.kind==='refuel')this.state.fuelKg=c.start!+(c.target!-c.start!)*c.progress;
  if(c.kind==='board'||c.kind==='deboard'){this.state.pax=Math.round(c.start!+(c.target!-c.start!)*c.progress);this.state.cargoKg=c.cargoStart!+(c.cargoTarget!-c.cargoStart!)*c.progress;}
  if(c.kind==='pushback')this.state.pushbackMetres=30*c.progress;
  if(c.progress===1){c.status='completed';c.message='本地仿真执行完成';if(c.kind==='gpu-connect')this.state.gpuConnected=true;if(c.kind==='gpu-disconnect')this.state.gpuConnected=false;}
  this.changed(now);return true;
 }
 fault(kind:Fault,on:boolean,now=Date.now()) {
  if(!['gpu','refuel'].includes(kind))throw Error('未知故障');
  this.state.faults=this.state.faults.filter(x=>x!==kind);if(on)this.state.faults.push(kind);
  if(on&&kind==='gpu')this.state.gpuConnected=false;
  for(const c of this.state.commands.filter(active))if(on&&((kind==='gpu'&&c.kind==='gpu-connect')||(kind==='refuel'&&c.kind==='refuel'))){c.status='failed';c.message='设备故障中止操作，已保留当前状态';}
  this.changed(now);
 }
 cancel(now=Date.now()) {for(const c of this.state.commands.filter(active)){c.status='failed';c.message='操作已停止，保留当前进度';}this.changed(now);}
 reset(prepared=false,fuelKg=5000,pax=0,now=Date.now(),cargoKg=0) {
  if(!Number.isFinite(fuelKg)||fuelKg<0||fuelKg>FUEL_CAPACITY_GALLONS*FUEL_KG_PER_GALLON||!Number.isInteger(pax)||pax<0||pax>436||!Number.isFinite(cargoKg)||cargoKg<0||cargoKg>44836)throw Error('预设参数无效');
  this.state={session:this.state.session+1,revision:this.state.revision+1,sampledAt:now,gpuConnected:prepared,fuelKg,pax,cargoKg,pushbackMetres:0,faults:[],commands:[]};this.receipts.clear();
 }
}
