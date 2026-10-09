"""Align visible demonstration references with the current manual's chapter structure."""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[2]
refs={
 'overview':'10.1','flight-import':'10.2及10.4','load-edit':'10.3','load-restore':'10.3','confirm':'2.3及10.3','dashboard':'10.1及10.3','ofp':'9.1及10.3',
 'payload':'7.3及11.3','fuel':'7.3及11.5','performance-input':'12.1','calculate':'12.1','history':'2.3及12.1','report':'9.3及11.6',
 'ground-change':'7.3及12.2','stale':'2.3及12.2','reconcile':'10.3及12.2','recalculate':'12.2','checklist':'8.3及10.6','tod':'8.3及10.6','finish':'12.1','base':'12.1',
 'landing':'8.3及12.3','tools-finish':'12.3','charts':'8.2及10.5','weather-adopt':'8.1及10.5','weather-confirm':'8.1及10.5',
 'parked':'7.4及11.5','gpu':'7.1及11.5','refuel':'7.2及11.5','board':'7.1及11.5','fault':'7.1及11.5','fault-reject':'7.1及11.5','fault-recover':'7.1及11.5','pushback':'7.3及11.5',
 'engineering-base':'3.1及11.1','engineering-toga':'3.4及11.1','engineering-flex':'3.5及11.1','engineering-chart':'3.3及11.1','engineering-stale':'2.3及11.1','engineering-infeasible':'3.4及11.1','engineering-restore':'11.1','engineering-report':'9.3及11.6',
 'planning-start':'11.2','planning-fuel':'4.2及11.2','planning-load':'5.4及11.3','planning-land':'6.1及11.4','planning-short':'6.5及11.4','planning-restore':'11.4','planning-report':'9.3及11.6'}
path=ROOT/'local-efb/presentation/scenarios.ts';text=path.read_text('utf-8');lines=text.splitlines()
for i,line in enumerate(lines):
 if 'manual:' not in line:continue
 match=re.search(r"id:'([^']+)'",line);assert match, line
 key=match.group(1);assert key in refs,key
 lines[i]=re.sub(r"manual:'[^']+'",f"manual:'技术说明书3.0 · {refs[key]}'",line)
text='\n'.join(lines)+'\n';text=text.replace('算法资料的校准边界见手册第 11 章','旧工具与工程着陆的区别见技术说明书3.0第8及12章');path.write_text(text,'utf-8')
print('Updated demonstration references:',len(refs))
