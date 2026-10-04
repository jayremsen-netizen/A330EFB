export const FUEL_KG_PER_GALLON=3.039;
export const FUEL_CAPACITY_GALLONS=36743;

/** The same staged distribution is used for initial quantities and desired tanks. */
export function distributeFuel(kg:number) {
  if(!Number.isFinite(kg)||kg<0||kg>FUEL_CAPACITY_GALLONS*FUEL_KG_PER_GALLON)throw Error('燃油量超出油箱容量');
  let remaining=kg/FUEL_KG_PER_GALLON;
  let inner=Math.min(1480,remaining/2);remaining-=inner*2;
  const outer=Math.min(964,remaining/2);remaining-=outer*2;
  const extra=Math.min(11095-1480,remaining/2);inner+=extra;remaining-=extra*2;
  return {inner,outer,center:Math.max(0,remaining)};
}

export function fuelVariables(kg:number) {
  const {inner,outer,center}=distributeFuel(kg);
  return {'FUEL TANK LEFT AUX QUANTITY':outer,'FUEL TANK RIGHT AUX QUANTITY':outer,
    'FUEL TANK LEFT MAIN QUANTITY':inner,'FUEL TANK RIGHT MAIN QUANTITY':inner,'FUEL TANK CENTER QUANTITY':center};
}
