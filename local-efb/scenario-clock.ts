/** Demonstration time is a fixed scenario instant, not a live observation clock. */
export function scenarioClock(value:string) {
 const parsed=new Date(value+'T08:00:00Z');
 const valid=/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
 const date=valid?value:'2026-10-03',time=valid?parsed:new Date(date+'T08:00:00Z');
 return {date,dayOfWeek:time.getUTCDay(),month:time.getUTCMonth()+1,day:time.getUTCDate(),zuluSeconds:28800,localSeconds:57600,fallback:!valid};
}
