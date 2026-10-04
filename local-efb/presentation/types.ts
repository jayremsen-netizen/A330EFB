export type Action =
 | {type:'nav';route:string;ready:string}
 | {type:'field';name:string;value:string}
 | {type:'inputLabel';label:string;value:string}
 | {type:'button';name:string}
 | {type:'import'}
 | {type:'focus';selector:string}
 | {type:'fuel';value:number}
 | {type:'checklist';item:string}
 | {type:'nativeInputs';values:(string|null)[]}
 | {type:'report'}
 | {type:'closeReport'}
 | {type:'expect';values:Record<string,string|number|boolean|null>};
export type Step={id:string;chapter:string;title:string;description:string;watch:string;manual:string;seconds:number;actions:Action[]};
export type Scenario={id:string;name:string;summary:string;steps:Step[]};
export type Snapshot={flightNumber:string;route:string;zfw:number;tow:number;fuel:number;fuelTarget:number;confirmed:boolean;groundChanged:boolean;v2:number|null;valid:boolean;resultStatus:string;history:number;checkedItems:number;todAltitude:number|null;todTarget:number|null;engineeringActive:boolean;engineeringStatus:string;engineeringValid:boolean;engineeringMode:string|null;engineeringThrustMode:string|null;engineeringV1:number|null;engineeringVR:number|null;engineeringV2:number|null;engineeringFlex:number|null;[key:string]:unknown};
export type Bridge={ready:()=>boolean;execute:(action:Action,fast?:boolean)=>Promise<void>;snapshot:()=>Snapshot;artifacts:()=>{flight:string;result:string|null;report:string|null};clearFocus:()=>void};
