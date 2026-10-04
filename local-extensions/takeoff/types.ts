import type {Flight} from '../flight';

export type TakeoffStatus='engineering-feasible'|'engineering-infeasible'|'unsupported'|'invalid';
export type Mode='TOGA'|'FLEX';
export interface TakeoffOptions {mode?:Mode;maxFlexC?:number}
export interface Point {distanceM:number;timeS:number;speedKt:number;groundSpeedKt:number;heightM:number;phase:string}
export interface Environment {pressureAltitudeFt:number;pressurePa:number;temperatureK:number;densityKgM3:number;headwindKt:number;crosswindKt:number}
export interface Available {toraM:number;todaM:number;asdaM:number}
export interface Margins {asdaM:number;todaM:number;toraM:number;climbGradient:number}
export interface Solution {
  v1Kt:number;vrKt:number;v2Kt:number;thrustMode:Mode;assumedTemperatureC:number|null;thrustRatio:number;
  asdM:number;todM:number;torM:number;runwayLimitKg:number|null;limitingFactor:string;margins:Margins;climbGradient:number;
  trajectory:{accelerateStop:Point[];continueTakeoff:Point[]};
}
export interface TakeoffResult {
  status:TakeoffStatus;label:string;at:string;input:Flight;options:TakeoffOptions;
  model:{id:string;version:string;provenance:unknown};assumptions:string[];errors:string[];warnings:string[];
  environment:Environment|null;available:Available|null;solution:Solution|null;
  diagnostics:{runwayLimitKg:number|null;limitingFactor:string;reasons:string[];massResolutionKg:number;v1ResolutionKt:number;flexResolutionC:number;modelSignature:string;elapsedMs:number};
}
