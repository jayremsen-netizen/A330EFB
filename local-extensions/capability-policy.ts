/** Browser-only capabilities. Preserve saved preferences but never activate unavailable integrations. */
const locked:Record<string,string>={
 GSX_FUEL_SYNC:'0',GSX_PAYLOAD_SYNC:'0',GSX_POWER_SYNC:'0',
 CONFIG_AUTO_SIMBRIEF_IMPORT:'DISABLED',CONFIG_SIMBRIDGE_ENABLED:'PERM OFF',
 NAVIGRAPH_ACCESS_TOKEN:'',NAVIGRAPH_REFRESH_TOKEN:'',
 CONFIG_METAR_SRC:'MSFS',EFB_AUTOFILL_CHECKLISTS:'0',
};
export function localCapabilityValue(key:string):string|undefined {
 return locked[key.replace(/^(?:A339X|A32NX)_/,'')];
}
