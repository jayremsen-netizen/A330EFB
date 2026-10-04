import type {Flight} from '../flight';

export interface FuelLeg {
 id:string; label:string; distanceNm:number; tasKt:number; headwindKt:number;
 fuelFlowKgPerHour:number; source:string;
}
export interface FuelPhase {minutes:number;distanceNm:number;fuelFlowKgPerHour:number;source:string;}
export interface FuelPlanInput {
 schemaVersion:1;
 airports:{from:string;to:string;alternate:string};
 source:string;
 route:string;
 cruiseAltitudeFt:number;
 alternateAltitudeFt:number;
 routeLegs:FuelLeg[];
 alternateLegs:FuelLeg[];
 climb:FuelPhase;descent:FuelPhase;missedApproach:FuelPhase;alternateDescent:FuelPhase;
 policy:{contingencyPercent:number;contingencyMinimumKg:number;holdingMinutes:number;holdingFlowKgPerHour:number;extraKg:number;source:string};
}
export interface FuelSegmentResult {id:string;label:string;route:'destination'|'alternate';phase:'climb'|'cruise'|'descent'|'missed-approach';distanceNm:number;minutes:number;fuelKg:number;groundSpeedKt:number|null;endAltitudeFt:number;source:string;}
export interface FuelTotals {tripKg:number;contingencyKg:number;alternateKg:number;finalReserveKg:number;extraKg:number;taxiKg:number;tripMinutes:number;alternateMinutes:number;tripDistanceNm:number;alternateDistanceNm:number;roundingKg:number;}
export interface FuelMassCase {rampFuelKg:number;takeoffFuelKg:number;destinationLandingFuelKg:number;alternateLandingFuelKg:number;zfwKg:number;takeoffMassKg:number;destinationLandingMassKg:number;alternateLandingMassKg:number;destinationReserveMarginKg:number;alternateReserveMarginKg:number;}
export type FuelFlightSnapshot=Pick<Flight,'id'|'number'|'date'|'profileId'|'from'|'to'|'alternate'|'route'|'pax'|'paxKg'|'bagKg'|'freightKg'|'oewKg'|'rampKg'|'taxiKg'>;
export interface FuelCheck {id:string;label:string;case:'planned'|'required';passed:boolean;actual:number;limit:number;unit:'kg';}
export interface FuelPlanResult {
 status:'invalid'|'engineering-feasible'|'engineering-shortfall'|'engineering-limit-exceeded';
 label:string;at:string;signature:string;input:FuelPlanInput;flight:FuelFlightSnapshot;
 model:{id:string;version:string;reservePolicy:'configurable-demo-policy';sources:{title:string;url:string;use:string}[];assumptions:string[];limits:{fuelCapacityKg:number;mtowKg:number;mzfwKg:number;mlwKg:number}};
 errors:string[];warnings:string[];canApply:boolean;requiredRampKg:number|null;plannedMarginKg:number|null;
 totals:FuelTotals|null;planned:FuelMassCase|null;required:FuelMassCase|null;segments:FuelSegmentResult[];checks:FuelCheck[];
}
