import type {Flight} from './flight';

const review=(f:Flight)=>f.departureReview?.airport===f.from?f.departureReview:{airport:f.from,previousAirport:f.from,weather:true,runway:true};

/** Airport edits retain the old evidence until the operator explicitly reviews it. */
export function departureChanged(previous:Flight,next:Flight):Flight {
 const previousAirport=/^[A-Z]{4}$/.test(previous.from)?previous.from:previous.departureReview?.previousAirport||'';
 return previous.from===next.from?next:{...next,departureReview:{airport:next.from,previousAirport,weather:false,runway:false}};
}
export function editDepartureInput(f:Flight,group:'runway'|'weather',key:string,value:unknown):Flight {
 const changed:Flight={...f,[group]:{...f[group],[key]:value},source:'local-manual'};
 // Editing a sampled observation cannot silently turn it into confirmed manual weather.
 if(group==='weather'&&f.weather.station)changed.departureReview={...review(f),weather:false};
 return changed;
}
export function adoptDepartureWeather(f:Flight,weather:Flight['weather']):Flight {
 if(weather.station!==f.from)throw Error('天气站点与起飞机场不一致，不能采用');
 return {...f,weather,departureReview:{...review(f),weather:true}};
}
export function reviewManualWeather(f:Flight):Flight {
 if(!/^[A-Z]{4}$/.test(f.from))throw Error('请先填写有效的起飞机场 ICAO');
 const evidence=[f.weather.source,f.weather.station,f.weather.observedAt,f.weather.supersededSource].filter(Boolean).join(' / ').slice(0,300);
 return {...f,weather:{...f.weather,source:`用户已复核 ${f.from} 手工条件（非观测报文）`,station:undefined,observedAt:undefined,supersededSource:evidence||undefined},departureReview:{...review(f),weather:true}};
}
export function reviewDepartureRunway(f:Flight):Flight {
 if(!/^[A-Z]{4}$/.test(f.from))throw Error('请先填写有效的起飞机场 ICAO');
 return {...f,departureReview:{...review(f),runway:true}};
}
