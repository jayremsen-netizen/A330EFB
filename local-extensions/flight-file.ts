import {Flight,parseFlight,validate} from './flight';
import {restoreDraft} from './persistence';

export interface FlightDraftFile {
 format:'a330efb-flight-draft';formatVersion:1;exportedAt:string;flight:Flight;
}
/** Completed flight files retain their original schema; unfinished files have an explicit draft envelope. */
export function flightFile(flight:Flight,draft=false):Flight|FlightDraftFile {
 return draft||validate(flight).length?{format:'a330efb-flight-draft',formatVersion:1,exportedAt:new Date().toISOString(),flight}:flight;
}
export function parseFlightFile(text:string):{kind:'flight'|'draft';flight:Flight} {
 if(new TextEncoder().encode(text).length>524288)throw Error('航班文件超过 512 KiB');
 const value=JSON.parse(text);
 if(value?.format!=='a330efb-flight-draft')return {kind:'flight',flight:parseFlight(text)};
 if(value.formatVersion!==1||typeof value.exportedAt!=='string'||!Number.isFinite(Date.parse(value.exportedAt))||
   Object.keys(value).some(k=>!['format','formatVersion','exportedAt','flight'].includes(k)))throw Error('草稿文件版本或结构无效');
 const flight=restoreDraft(value.flight);
 // File imports are editable plans, never a transfer of a loading approval or calculation authority.
 if(flight.planning)delete flight.planning.loadingAccepted;
 return {kind:'draft',flight};
}
