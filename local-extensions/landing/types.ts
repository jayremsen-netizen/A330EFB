export type LandingTarget='destination'|'alternate';
export interface LandingFlight {id:string;number:string;date:string;to:string;alternate?:string}
export interface LandingInput {
 target:LandingTarget;airport:string;
 runway:{ident:string;headingDeg:number;ldaM:number;elevationFt:number;slopePercent:number;condition:'dry'|'wet'|'contaminated';source:string};
 weather:{station:string;oatC:number;qnhHpa:number;windDirDeg:number;windKt:number;gustKt:number;source:string};
 configuration:'FULL'|'CONF3';autobrake:'LOW'|'MED'|'MAX';reversers:0|1|2;
 approachAdditiveKt:number;distanceFactor:number;
}
export interface LandingContext {flight:LandingFlight;massSource:string;massSignature:string;workflowSignature:string}
export interface LandingEnvironment {pressureAltitudeFt:number;pressurePa:number;temperatureK:number;densityKgM3:number;headwindKt:number;crosswindKt:number}
export interface LandingPoint {distanceM:number;timeS:number;groundSpeedKt:number;heightM:number;phase:'approach'|'flare'|'delay'|'braking'}
export interface LandingSolution {
 massKg:number;vrefKt:number;vappKt:number;additiveKt:number;touchdownGroundSpeedKt:number;
 airDistanceM:number;delayDistanceM:number;brakingDistanceM:number;unfactoredDistanceM:number;requiredDistanceM:number;
 marginM:number;marginPercent:number;stopTimeS:number;fieldLimitKg:number|null;limitReason:string;
 trajectory:LandingPoint[];
}
export interface LandingResult {
 status:'invalid'|'unsupported'|'engineering-infeasible'|'engineering-feasible';label:string;at:string;
 model:{id:string;version:string;signature:string;provenance:{status:string;description:string}};
 input:LandingInput;massKg:number;context:LandingContext;signature:string;errors:string[];warnings:string[];
 environment:LandingEnvironment|null;solution:LandingSolution|null;
 diagnostics:{fieldLimitKg:number|null;limitReason:string;massResolutionKg:number};
}
