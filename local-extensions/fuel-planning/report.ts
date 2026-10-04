import type {FuelPlanResult} from './types';

export const fuelEscape=(value:unknown)=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const n=(x:number)=>x.toLocaleString('en-US',{maximumFractionDigits:1});

/** The horizontal coordinates are the explicit segment distances, not airport geometry. */
export function fuelProfileSvg(r:FuelPlanResult):string {
 if(!r.totals||!r.segments.length)return '';
 const width=850,left=62,right=24,top=40,bottom=230,plot=width-left-right;
 const total=r.totals.tripDistanceNm+r.totals.alternateDistanceNm,maxAlt=Math.max(r.input.cruiseAltitudeFt,r.input.alternateAltitudeFt)*1.15;
 const x=(d:number)=>left+d/Math.max(1,total)*plot,y=(alt:number)=>bottom-alt/maxAlt*(bottom-top);
 let distance=0;
 const points=[{x:left,y:bottom}];for(const s of r.segments){distance+=s.distanceNm;points.push({x:x(distance),y:y(s.endAltitudeFt)});}
 const line=points.map((p,i)=>`${i?'L':'M'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
 const destination=x(r.totals.tripDistanceNm);
 const grid=[0,10000,20000,30000,40000].filter(v=>v<=maxAlt).map(v=>`<line x1="${left}" x2="${width-right}" y1="${y(v)}" y2="${y(v)}" stroke="#8b9caf" stroke-opacity=".25"/><text x="${left-8}" y="${y(v)+4}" text-anchor="end">${n(v)}</text>`).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 315" role="img" aria-label="手工航段距离与高度剖面" style="width:100%;height:auto;font:14px Arial,sans-serif;color:inherit"><title>主航路与备降的工程示意剖面</title><g fill="currentColor">${grid}<text x="${left}" y="20">高度 ft · 示意剖面，不用于导航</text><rect x="${destination}" y="${top}" width="${width-right-destination}" height="${bottom-top}" fill="#ce9238" fill-opacity=".08"/><path d="${line}" fill="none" stroke="#58bbae" stroke-width="3"/><line x1="${destination}" x2="${destination}" y1="${top}" y2="${bottom}" stroke="#ce9238" stroke-dasharray="5 5"/><text x="${left}" y="${bottom+25}">${fuelEscape(r.input.airports.from)}</text><text x="${destination-7}" y="${bottom+25}" text-anchor="end">${fuelEscape(r.input.airports.to)}</text><text x="${width-right}" y="${bottom+48}" text-anchor="end">${fuelEscape(r.input.airports.alternate)} 备降</text><text x="${left}" y="${bottom+72}">主航程 ${n(r.totals.tripDistanceNm)} NM / ${n(r.totals.tripMinutes)} min；备降 ${n(r.totals.alternateDistanceNm)} NM / ${n(r.totals.alternateMinutes)} min</text></g></svg>`;
}

export function fuelBreakdownSvg(r:FuelPlanResult):string {
 const t=r.totals;if(!t||r.requiredRampKg===null)return '';
 const items:[string,number,string][]=[['滑行',t.taxiKg,'#aab7c4'],['航程',t.tripKg,'#55b8a8'],['应急',t.contingencyKg,'#d9b35c'],['备降',t.alternateKg,'#7aabe0'],['最终储备',t.finalReserveKg,'#bd95d9'],['额外',t.extraKg,'#cd8876']];
 let position=34;const available=782;
 const bars=items.map(([label,kg,color])=>{const width=kg/r.requiredRampKg!*available,rect=`<rect x="${position}" y="40" width="${width}" height="28" fill="${color}"><title>${label} ${n(kg)} kg</title></rect>`;position+=width;return rect;}).join('');
 const labels=items.map(([label,kg,color],i)=>`<rect x="${34+(i%3)*268}" y="${94+Math.floor(i/3)*35}" width="12" height="12" fill="${color}"/><text x="${54+(i%3)*268}" y="${105+Math.floor(i/3)*35}">${label} ${n(kg)} kg</text>`).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 180" role="img" aria-label="工程燃油需求分类比例" style="width:100%;height:auto;font:15px Arial,sans-serif;color:inherit"><g fill="currentColor"><text x="34" y="23">建议停机坪燃油 ${n(r.requiredRampKg)} kg · 含向上取整 ${n(t.roundingKg)} kg</text>${bars}${labels}</g></svg>`;
}

export function fuelPlanReportHtml(r:FuelPlanResult):string {
 const body=r.totals?`<h2>燃油预算</h2><p>当前计划 ${n(r.flight.rampKg)} kg；建议 ${n(r.requiredRampKg!)} kg；差额 ${n(r.plannedMarginKg!)} kg。</p>${fuelProfileSvg(r)}${fuelBreakdownSvg(r)}<h2>当前计划的名义着陆状态</h2><p>目的地燃油账 ${n(r.planned!.destinationLandingFuelKg)} kg，备降燃油账 ${n(r.planned!.alternateLandingFuelKg)} kg。负值表示无法完成航程，不表示负油量。</p><p>目的地着陆质量 ${r.planned!.destinationLandingFuelKg>=0?n(r.planned!.destinationLandingMassKg)+' kg':'无可达着陆状态'}；备降着陆质量 ${r.planned!.alternateLandingFuelKg>=0?n(r.planned!.alternateLandingMassKg)+' kg':'无可达着陆状态'}。</p><h2>约束检查</h2><ul>${r.checks.map(c=>`<li>${c.case==='planned'?'当前计划':'建议计划'}：${fuelEscape(c.label)} — ${c.passed?'满足':'不满足'}；值 ${n(c.actual)} kg / 约束 ${n(c.limit)} kg</li>`).join('')}</ul>`:'';
 return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>A330EFB 航路与备降燃油工程报告</title><style>body{max-width:950px;margin:32px auto;padding:0 24px;color:#152b42;font:15px/1.6 Arial,"Microsoft YaHei",sans-serif}h1{font-size:25px}h2{font-size:20px}.scope{padding:14px;border:2px solid #b8873d;background:#fff6e8}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:11px/1.5 monospace}svg{break-inside:avoid}</style><h1>A330EFB 航路与备降燃油工程报告</h1><p class="scope">固定油耗与可配置储备工程模型，未经 A330 性能校准；不构成实际放行、法规符合性或燃油应急判断。</p><p>${fuelEscape(r.flight.number)} · ${fuelEscape(r.input.airports?.from)} → ${fuelEscape(r.input.airports?.to)} / 备降 ${fuelEscape(r.input.airports?.alternate)}；${fuelEscape(r.label)}</p><p>模型 ${fuelEscape(r.model.id)} ${fuelEscape(r.model.version)} · ${fuelEscape(r.at)}</p>${body}<h2>诊断</h2><ul>${[...r.errors,...r.warnings].map(s=>`<li>${fuelEscape(s)}</li>`).join('')}</ul><h2>模型边界与资料来源</h2><ul>${r.model.assumptions.map(s=>`<li>${fuelEscape(s)}</li>`).join('')}</ul>${r.model.sources.map(s=>`<p><a href="${fuelEscape(s.url)}">${fuelEscape(s.title)}</a>：${fuelEscape(s.use)}</p>`).join('')}<h2>可追溯输入、结果与签名</h2><pre>${fuelEscape(JSON.stringify(r,null,2))}</pre></html>`;
}
