type Unit={dimension:string;factor:number;offset?:number};
const definitions:Record<string,Unit>={};
function define(names:string[],dimension:string,factor=1,offset=0){for(const n of names)definitions[n]={dimension,factor,offset};}
define(['kg','kilogram','kilograms'],'mass');define(['lb','lbs','pound','pounds'],'mass',0.45359237);
define(['gallon','gallons','us gallon','us gallons'],'volume');define(['liter','liters','litre','litres'],'volume',1/3.785411784);
define(['feet','foot','ft'],'length');define(['meter','meters','metre','metres','m'],'length',1/0.3048);
define(['degrees','degree','degree latitude','degree longitude'],'angle');define(['radian','radians'],'angle',180/Math.PI);
define(['knots','knot'],'speed');define(['meters per second'],'speed',1/0.5144444444444445);define(['feet per second'],'speed',0.3048/0.5144444444444445);
define(['celsius','c','degrees celsius'],'temperature');define(['fahrenheit'],'temperature',5/9,-32*5/9);
define(['hpa','millibars','hectopascal'],'pressure');define(['inhg','inches of mercury'],'pressure',33.8638866667);
const normal=(u:string)=>String(u||'number').trim().toLowerCase();

export function convertUnit(value:number,from:string,to:string):number {
  const a=definitions[normal(from)],b=definitions[normal(to)];
  if(normal(from)===normal(to)||!a||!b)return value;
  if(a.dimension!==b.dimension)throw Error(`不兼容单位 ${from} / ${to}`);
  return (value*a.factor+(a.offset||0)-(b.offset||0))/b.factor;
}

export function canonicalUnit(name:string,requested='number') {
  const n=name.replace(/^A:/,'');
  if(/WEIGHT|AIRFRAME_(ZFW|GW)(?:_DESIRED)?$|FM_(GROSS_WEIGHT|ZFW)$|CARGO_.*DESIRED$|FUEL_DESIRED$/.test(n)&&!/CG|PER_GALLON/.test(n))return 'kg';
  if(n==='FUEL WEIGHT PER GALLON')return 'kg';
  if(/^FUEL .* (QUANTITY|CAPACITY)$/.test(n))return 'gallons';
  if(n==='PLANE ALTITUDE')return 'feet';
  if(/PLANE (LATITUDE|LONGITUDE|HEADING)/.test(n))return 'degrees';
  return requested;
}

export function convertVariable(value:number,name:string,from:string,to:string,density=3.039) {
  const a=definitions[normal(from)],b=definitions[normal(to)];
  if(/^FUEL .* (QUANTITY|CAPACITY)$/.test(name)&&a&&b&&a.dimension!==b.dimension){
    if(a.dimension==='volume'&&b.dimension==='mass')return convertUnit(convertUnit(value,from,'gallons')*density,'kg',to);
    if(a.dimension==='mass'&&b.dimension==='volume')return convertUnit(convertUnit(value,from,'kg')/density,'gallons',to);
  }
  return convertUnit(value,from,to);
}
