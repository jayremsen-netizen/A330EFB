import type {Flight} from './flight';
export type WeatherSample={id:string;station:string;name:string;observedAt:string;windDir:number;windKt:number;oat:number;qnh:number;raw:string};
export const weatherSamples:WeatherSample[]=[
 {id:'zutf-calm',station:'ZUTF',name:'成都天府 晴天样例',observedAt:'2026-10-04T08:00:00Z',windDir:10,windKt:6,oat:22,qnh:1013,raw:'ZUTF 040800Z 01006KT CAVOK 22/12 Q1013'},
 {id:'zutf-wind',station:'ZUTF',name:'成都天府 风况变化样例',observedAt:'2026-10-04T08:30:00Z',windDir:60,windKt:18,oat:19,qnh:1008,raw:'ZUTF 040830Z 06018KT 8000 SCT025 19/13 Q1008'},
 {id:'zspd-calm',station:'ZSPD',name:'上海浦东 晴天样例',observedAt:'2026-10-04T08:00:00Z',windDir:170,windKt:8,oat:24,qnh:1012,raw:'ZSPD 040800Z 17008KT CAVOK 24/15 Q1012'},
 {id:'zsss-calm',station:'ZSSS',name:'上海虹桥 备降样例',observedAt:'2026-10-04T08:00:00Z',windDir:180,windKt:7,oat:23,qnh:1012,raw:'ZSSS 040800Z 18007KT CAVOK 23/15 Q1012'}
];
export function sampleFor(station:string){return weatherSamples.find(x=>x.station===station);}
export function sampleWeather(sample:WeatherSample):Flight['weather'] {
 return {windDir:sample.windDir,windKt:sample.windKt,oat:sample.oat,qnh:sample.qnh,
  source:'A330EFB 本地天气样例 '+sample.id,observedAt:sample.observedAt,station:sample.station};
}
export function metarFor(station:string,flight?:Flight){
 if(flight&&station===flight.from){
  const chosen=weatherSamples.find(x=>x.id===flight.weather.source?.split(' ').at(-1));
  if(chosen&&chosen.station===station&&['windDir','windKt','oat','qnh'].every(k=>(chosen as any)[k]===(flight.weather as any)[k]))return chosen.raw;
  return ''; // A manually edited plan must not keep a previous sample METAR.
 }
 return sampleFor(station)?.raw||'';
}
