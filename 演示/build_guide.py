from pathlib import Path
import json
from html import escape

R=Path(__file__).resolve().parent
scenes=json.loads((R/'场景脚本.json').read_text('utf-8'))
lines=['# A330 EFB 现场讲解脚本','', '本脚本与程序的三套自动场景逐节对应。每一步均由软件执行实际页面操作，讲解人员可暂停补充说明。手册页码指 300 页重写版 PDF 的页码。','']
for scene in scenes:
    seconds=sum(s['seconds'] for s in scene['steps'])
    lines += [f"## {scene['name']}",'',scene['summary'],'',f"共 {len(scene['steps'])} 节，标准速度的讲解停留合计 {seconds//60} 分 {seconds%60} 秒，另加页面操作时间。",'']
    for i,s in enumerate(scene['steps'],1):
        lines += [f"### {i:02d}　{s['title']}",'',s['description'],'',f"**观察重点：** {s['watch']}",'',f"**手册对应：** {s['manual']}　**停留：** {s['seconds']} 秒",'']
        commands=[]
        for a in s['actions']:
            t=a['type']
            if t=='nav':commands.append('进入 '+a['route'])
            elif t=='field':commands.append(f"输入 {a['name']} = {a['value']}")
            elif t=='button':commands.append('点击“'+a['name']+'”')
            elif t=='import':commands.append('通过程序文件入口导入 DEMO330 JSON')
            elif t=='fuel':commands.append(f"原生燃油目标输入 {a['value']} kg")
            elif t=='checklist':commands.append('勾选 '+a['item'])
            elif t=='nativeInputs':commands.append('填写原生工具输入：'+', '.join(str(x) for x in a['values'] if x is not None))
            elif t=='report':commands.append('显示当前真实 HTML 核算报告')
            elif t=='expect':commands.append('核对业务状态：'+json.dumps(a['values'],ensure_ascii=False))
        lines+=['自动操作：'+'；'.join(commands)+'。','']
(R/'讲解脚本.md').write_text('\n'.join(lines),'utf-8')
body=[]
for line in lines:
    if not line:continue
    if line.startswith('### '):body.append('<h3>'+escape(line[4:])+'</h3>')
    elif line.startswith('## '):body.append('<h2>'+escape(line[3:])+'</h2>')
    elif line.startswith('# '):body.append('<h1>'+escape(line[2:])+'</h1>')
    else:body.append('<p>'+escape(line.replace('**',''))+'</p>')
style="body{font-family:'Microsoft YaHei',Arial,sans-serif;line-height:1.9;color:#223248;background:#f1f4f8;margin:0}main{max-width:1040px;background:white;margin:35px auto;padding:50px 65px;border-top:8px solid #259b87}h1{font-size:30px}h2{font-size:24px;margin-top:60px;padding-bottom:15px;border-bottom:2px solid #dce5eb;color:#16786b}h3{font-size:19px;margin-top:36px}p{font-size:15px}a{color:#16786b}.entry{background:#edf7f4;padding:16px 22px}@media print{body{background:#fff}main{padding:0;margin:0;border:0}h2{break-before:page}}"
entry='<div class="entry">双击根目录“启动投标演示.cmd”后，<a href="http://127.0.0.1:9698/demo.html?autoplay=1">进入自动演示</a>。<br><a href="../output/pdf/A330电子飞行包系统技术方案与操作说明书_重写版.pdf">打开 300 页项目技术说明书</a>。</div>'
(R/'讲解脚本.html').write_text('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>A330 EFB 现场讲解脚本</title><style>'+style+'</style><main>'+entry+'\n'.join(body)+'</main></html>','utf-8')
print('Guide created:',len(scenes),'scenarios')
