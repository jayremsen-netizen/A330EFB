from pathlib import Path
import json,html
from reportlab.lib.colors import HexColor,white
from model import *
from draw import diagram,INK,MUTED,BLUE,TEAL,PALE
AUX=[]
W,H=595.2756,841.8898;M=48;CW=W-2*M

def aux(c,num,title,p,part='前言与阅读索引'):
    import __main__ as r
    c.setFillColor(HexColor(MUTED));c.setFont('CN',8);c.drawString(M,H-30,part);c.drawRightString(W-M,H-30,'A330 EFB  /  V2.0')
    z=r.par(title,CW,18,True);y=H-67;z.drawOn(c,M,y-z.height);y-=z.height+19
    for size,fs in [(11.3,1),(11,1),(10.7,.93),(10.4,.87)]:
        blocks=r.blocks(p,size,fs)
        if sum(z[2] for z in blocks)<=y-55:break
    else:raise RuntimeError('Aux overflow '+str(num)+' '+title)
    for kind,obj,h in blocks:
        if kind=='para':obj.drawOn(c,M,y-obj.height)
        elif kind=='table':obj.drawOn(c,M,y-h+14)
        elif kind in ['code','note']:
            c.setFillColor(HexColor(PALE));c.roundRect(M,y-h+8,CW,h-8,4,fill=1,stroke=0);obj.drawOn(c,M+11,y-12-obj.height)
        elif kind=='figure':
            d,cap=obj;fh=r.figure_height(d)*fs
            name=f'aux-{num:03d}.svg';(ROOT/'assets'/name).write_text(diagram(c,M,y,CW,fh,d),'utf-8');d['asset']=name
            cap=r.par('图 '+str(num)+'  '+d['title'],CW,8.6,color=MUTED);cap.drawOn(c,M,y-fh-8-cap.height)
            r.FIGURES.append(dict(id=f'aux-{num}',title=d['title'],page=num,kind=d['kind']))
        y-=h
    c.setFillColor(HexColor(MUTED));c.setFont('CN',8);c.drawString(M,27,'A330 EFB  |  技术方案与操作说明书  |  V2.0');c.drawRightString(W-M,27,f'{num} / 300')
    c.bookmarkPage(f'aux{num}');c.addOutlineEntry(title,f'aux{num}',0)
    r.AUDIT.append(dict(page=num,chapter=0 if num<11 else 99,section=title,title=title,bottom=round(y,1),font=size,figures=bool(p.get('diagram')),characters=sum(len(t) for t in p['paragraphs'])))
    AUX.append({**p,'page':num,'title':title});c.showPage()

def front(c,book):
    import __main__ as r
    c.setFillColor(HexColor(INK));c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(HexColor('#65c5c3'));c.rect(M,H-123,57,5,fill=1,stroke=0)
    c.setFillColor(HexColor('#d5e5ef'));c.setFont('CN',13);c.drawString(M,H-91,'HEADWIND A339X  /  FLYPAD OS 3')
    c.setFillColor(white);c.setFont('CNB',32);c.drawString(M,H-185,'A330 电子飞行包系统')
    c.setFont('CNB',24);c.drawString(M,H-231,'技术方案与操作说明书')
    c.setFillColor(HexColor('#d5e5ef'));c.setFont('CN',12);c.drawString(M,H-272,'系统架构  ·  模块设计  ·  关键技术  ·  操作使用')
    c.setFont('CN',11);c.drawString(M,H-308,'投标技术附件参考稿  |  第二版  |  2026 年 10 月')
    d=D('layers','系统、业务与运行的三层视图',['本地航班、重量与性能参考','原生 flyPad 界面及专业模块','浏览器宿主、静态服务与可复现源码'])
    c.setFillColor(white);c.roundRect(M,167,CW,232,8,fill=1,stroke=0);svg=diagram(c,M+16,379,CW-32,188,d);(ROOT/'assets/cover.svg').write_text(svg,'utf-8')
    c.setFillColor(HexColor('#d5e5ef'));c.setFont('CN',10);c.drawString(M,123,'基于固定开源代码和本地运行实况编写')
    c.drawString(M,101,'适用对象：软件评审、技术方案编制、开发与演示操作')
    c.setFont('CN',8);c.drawString(M,35,'A330 EFB  |  V2.0');c.drawRightString(W-M,35,'1 / 300')
    c.bookmarkPage('cover');c.addOutlineEntry('封面','cover',0);c.showPage()
    r.AUDIT.append(dict(page=1,chapter=0,section='封面',title='封面',bottom=101,font=12,figures=1,characters=110));r.FIGURES.append(dict(id='cover',title=d['title'],page=1,kind='layers'))
    aux(c,2,'文件定位与版本基线',P('', '''本书描述以 Headwind A339X 为机型基础、以 FlyByWire flyPadOS 3 为共享界面基础的本地电子飞行包软件。内容包括现有实现、设计理由、接口数据、计算机制和实际操作。标明“扩展设计”的内容属于后续接口方案，不代表已经连接外部后端。

本书可作为投标技术附件的参考正文。项目名称暂用本书标题，未填入未提供的投标单位、资质、服务承诺或特定招标评分结论。实际商务主体和项目条款应采用真实资料。

当前软件为浏览器开发运行模式，核心航班流程不使用 SimBrief。性能模块的资料与能力边界在相应章节明确说明。''',diagram=D('entity','本文档固定的三类基线',[['源码','Headwind 固定提交','FlyByWire 固定提交','本地叠加实现'],['运行','Windows 浏览器','127.0.0.1:9697','开发宿主'],['文档','V2.0','300 页','2026-10-04']]),table=T('基线项目|标识|定位','Headwind|41eace79…5cb|完整值见资料索引\nFlyByWire|1bf4b8ed…582|完整值见资料索引\n参考资料 / 内核|1.0.0 / 1.0.0|本地 V2 参考模块\n正文结构|220 页设计 + 60 页操作|另有前置与附录各 10 页')))
    aux(c,3,'技术方案摘要',P('', '''系统以原生 EFB 页面为操作载体，用本地 Flight 统一航班、载荷、燃油、跑道和天气输入。确认动作把同一计划投影到仪表盘、签派资料和地面目标，使页面之间能够围绕同一航班工作。JSON 文件与报告提供可独立保存的输入及结果。

本地计算采用独立 TypeScript 函数，质量派生、输入校验与速度表插值分开组织。结果保存输入快照与资料版本，输入或地面目标改变时停止旧结果的当前出口。该结构将算术、状态和界面职责分离，便于分析与替换。

宿主适配保留原生模块结构，通过浏览器 API 实现开发运行。真实飞机系统、外部资料服务和其他仿真后端具有独立连接边界。''',diagram=D('components','方案核心的数据与交互关系',['本地 Flight','确认与状态管理','原生专业页面','参考计算','JSON 与报告','浏览器宿主'],[(0,1,'统一输入'),(1,2,'计划投影'),(1,3,'确认后计算'),(3,4,'固定快照'),(5,2,'运行接口')]),table=T('设计重点|具体机制|带来的作用','输入一致|集中 Flight 与 weights|减少页面重复真值\n结果追溯|快照、版本和签名|解释当前性\n界面复用|原生模块加局部扩展|保留现有功能结构\n本地运行|静态产物与宿主适配|无需飞行会话即可演示')))
    aux(c,4,'系统能力与实现状态',P('', '''本地航班、文件交换、重量核对、有限 V2 参考、历史和报告构成当前核心闭环。原生检查单、下降工具、着陆页面和设置提供更完整的 EFB 操作环境。外部资料页面保持其实际连接或未配置状态。

功能可见、代码可运行和航空资料已校准是不同结论。本书分别说明这些层次，使技术评审能够据明确结构和证据判断范围。未来连接真实后端时，优先对齐状态快照、命令回执、单位和会话身份。''',diagram=D('lanes','当前实现与外部依赖的位置',[['本地核心','航班输入','参考及记录','报告输出'],['原生页面','检查单与工具','地面及设置','交互保留'],['外部依赖','航图与通信','真实飞机系统','后端连接']]),table=T('能力域|当前状态|说明章节','本地航班与文件|已实现|7、19\n载荷、燃油及地面界面|已运行，宿主为演示|9、20\nV2 源码表参考|已实现，资料未独立校准|10、21\nTOD / 着陆|原生算法与页面|11、21\n真实后端快照及命令|扩展设计|5、16\n外部授权航图|未实联|12、22')))
    aux(c,5,'阅读路径与图文约定',P('', '''评审总体方案可先阅读第 1～6 章，了解系统边界、架构、数据和接口，再按专业关注点进入第 7～15 章。开发人员可以结合第 16～17 章理解结果一致性、宿主和构建机制。使用者可直接从第 18 章开始操作。

第 18～22 章的图像均来自本地程序实际运行。局部放大图只裁取原画面中的相关区域，不重绘或替换控件。截图中的航班、日期和油量属于当时的演示场景，正文在需要复算时列出具体输入。

各节页脚使用方括号资料编号，完整对应关系见附录。源码结构分析优先采用固定提交和本地实现，网络文档用于解释原生模块背景。''',diagram=D('tree','按使用角色进入本书',['阅读入口',['方案评审','1～6 总体设计','7～15 专业设计'],['开发维护','16～17 关键技术','附录字段及源码'],['操作使用','18～22 操作步骤','真实画面与恢复方法']]),table=T('标记|含义|阅读方式','扩展设计|未实联的接口方案|区分现有实现\n本节依据 [编号]|资料及源码来源|查附录索引\n局部放大|真实画面裁取|用于识别控件\nreference-only|源码表参考状态|结合模型范围理解')))
    entries=[];n=11
    for ch in book:
        entries.append((f"第 {ch['number']} 章  {ch['title']}",n,True))
        for si,s in enumerate(ch['sections'],1):
            entries.append((f"{ch['number']}.{si}  {s['title']}",n,False));n+=len(s['pages'])
    assert len(entries)==115
    toc_pages=[];start=0
    for k in range(4):
        end=start+23
        if entries[end-1][2]:end-=1
        toc_pages.append(entries[start:end]);start=end
    toc_pages.append(entries[start:]);assert len(toc_pages[-1])<=25
    for k in range(5):
        num=6+k;c.setFillColor(HexColor(MUTED));c.setFont('CN',8);c.drawString(M,H-30,'目录  /  按 PDF 实际页码编排')
        z=r.par('详细目录'+('' if k==0 else f'（{k+1}）'),CW,22,True);z.drawOn(c,M,H-72-z.height)
        y=H-143
        for title,pn,bold in toc_pages[k]:
            if bold:c.setFillColor(HexColor(PALE));c.roundRect(M-5,y-8,CW+10,23,3,fill=1,stroke=0)
            c.setFillColor(HexColor(INK));c.setFont('CNB' if bold else 'CN',10.4 if bold else 10)
            c.drawString(M if bold else M+12,y,title);c.drawRightString(W-M,y,str(pn));c.linkRect('',f'p{pn}',(M,y-5,W-M,y+14),relative=0,thickness=0)
            y-=25
        c.setStrokeColor(HexColor('#afc3d2'));c.line(M,80,W-M,80);c.setFillColor(HexColor(MUTED));c.setFont('CN',9);c.drawString(M,60,'设计正文 11–230 页  ·  操作说明 231–290 页  ·  附录 291–300 页')
        c.setFont('CN',8);c.drawString(M,27,'A330 EFB  |  技术方案与操作说明书  |  V2.0');c.drawRightString(W-M,27,f'{num} / 300');c.bookmarkPage(f'toc{num}');c.addOutlineEntry('详细目录 '+str(k+1),f'toc{num}',0);c.showPage()
        r.AUDIT.append(dict(page=num,chapter=0,section='目录',title='详细目录',bottom=y+25,font=10,figures=0,characters=sum(len(v[0]) for v in toc_pages[k])))

def appendix(c,book,n):
    aux(c,291,'附录 A  术语与缩略语',P('', '''本表统一本书中出现的主要术语。英文缩略语用于对应程序字段和原生界面，中文解释用于说明业务含义。重量缩写需要结合其燃油组成阅读，不能只把它们看作不同名称的总重量。

“确认”表示用户采用当前输入，“当前有效”表示结果仍与确认输入及资料版本一致；这两个词不表示飞机获得运行许可。''',table=T('术语|中文含义|本书使用方式','EFB|电子飞行包|本地软件与原生界面\nOEW|运行空重|当前资料包固定基础质量\nPayload|载荷|人体、行李和额外货物\nZFW|零油重|OEW 加载荷\nTOW|起飞重量|ZFW 加起飞燃油\nTORA / TODA / ASDA|三类声明距离|输入保存及一致性检查\nQNH|海平面气压设定|气压高度换算输入\nTOD|下降顶点|几何下降工具\nVLS / V2|不同阶段的速度量|分别属于着陆和起飞模型\nOFP|运行飞行计划资料|本地生成的摘要页面'),diagram=D('formula','主要重量术语的对应关系',[['质量组成','OEW + Payload = ZFW'],['起飞重量','ZFW + Ramp fuel − Taxi fuel = TOW']])),'资料附录')
    aux(c,292,'附录 B  航班身份字段词典',P('', '''Flight 的身份字段与业务数值一起保存。schemaVersion 控制文件结构解释，profileId 控制机型资料匹配，id 区分本地对象，number 面向用户显示。来源文字说明输入渠道，不是自动签发的认证信息。

导入以整个对象为单位校验。字段名区分大小写，不能把显示用中文名称直接替换为 JSON 键名。''',table=T('字段|类型 / 例子|说明','schemaVersion|number / 1|结构模式\nprofileId|string|A330-941-TRENT7000-LOCAL\nid|string|本地对象标识\nnumber|string / DEMO330|航班显示号\ndate|string / 2026-10-03|日期字段\nfrom / to|string / ZUTF、ZSPD|起飞与目的 ICAO\nalternate|string / ZSSS|备降记录\nroute|string|人工航路文字\nsource|string|local-example 等输入来源'),diagram=D('entity','结构、机型和航班分别具有身份',[['结构','schemaVersion','格式解释'],['机型','profileId','资料匹配'],['航班','id / number','本次业务对象']])),'资料附录')
    aux(c,293,'附录 C  质量与构型字段词典',P('', '''本地 JSON 的质量字段统一以 kg 保存，界面可采用其他显示单位。整数人数与连续质量分别校验。flaps 为数值 1、2 或 3，防冰和引气为真正的 JSON 布尔值，不能用字符串 true 或 false 替代。

派生重量不作为 Flight 的第二套独立输入保存。报告中的 weights 是按当时输入计算的快照。''',table=T('字段|单位 / 类型|说明','pax|整数人数|0～436 的录入范围\npaxKg|kg / 人|人体平均质量\nbagKg|kg / 人|行李平均质量\nfreightKg|kg|不含上述行李的额外货物\noewKg|kg|当前固定 127000\nrampKg|kg|停机坪燃油\ntaxiKg|kg|计划滑行耗油\nflaps|1 / 2 / 3|源码表配置索引\nantiIce / packs|boolean|系统配置输入'),diagram=D('formula','本地单位转换常量',[['质量','1 lb = 0.45359237 kg'],['长度与压力','1 ft = 0.3048 m；1 inHg ≈ 33.8638866667 hPa']])),'资料附录')
    aux(c,294,'附录 D  跑道与天气字段词典',P('', '''runway 与 weather 是 Flight 的嵌套对象。距离统一以 m 保存，标高为 ft，方向为度。来源文字跟随跑道资料保留，便于在报告中理解输入依据。

结构完整不代表数据已经来自机场权威数据库。当前软件按人工输入使用这些值，并对数值及相互关系进行校验。''',table=T('字段|单位 / 类型|含义','runway.ident|string|两位数字及可选 L/R/C\nrunway.heading|degree|跑道方向\nrunway.tora / toda / asda|m|声明距离\nrunway.intersection|m|入口距离扣减\nrunway.elevationFt|ft|标高\nrunway.slope|percent|坡度\nrunway.condition|string|dry / wet / contaminated\nrunway.source|string|资料来源说明\nweather.windDir / windKt|degree / kt|风向来向及风速\nweather.oat / qnh|°C / hPa|温度及气压'),diagram=D('formula','数据保存与辅助量的关系',[['有效距离','effectiveTora = tora − intersection'],['风向差','θ = windDir − runway.heading']])),'资料附录')
    aux(c,295,'附录 E  状态与事件速查',P('', '''状态函数是本地业务的统一入口。页面按钮可以改变外观，但确认、结果出口和历史资格最终由这些函数判断。表中列出调用含义，便于从设计章节回到具体实现。

local-ground-change 来自浏览器适配的目标变化，表示需要重新核对，不承载完整的外部飞机快照。''',table=T('入口或状态|含义|主要影响','editFlight|替换草稿|撤销确认\nconfirmFlight|确认合法输入|写签名并投影原生数据\nrunCalculation|执行当前参考|要求确认匹配\ncurrentResult|取得当前有效结果|统一控制出口\narchiveResult|保存当前结果|最近 20 条\nrestoreHistory|恢复旧输入|需重新确认和计算\nmarkGroundChanged|标记目标变化|旧结果退出当前状态\nreadFuelTarget|读取地面燃油目标|更新 rampKg\nlocal-ground-change|目标修改事件|触发变化标记'),diagram=D('state','本地业务的简明状态关系',['草稿','已确认','当前参考结果','过期结果'],[(0,1,'确认'),(1,2,'计算'),(2,3,'输入或目标改变'),(3,1,'核对后确认')])),'资料附录')
    refs1=['HW','FBW','WEB','PAD','DIS','GND','PERF','CHART','CHK','FAIL','SET','SIM']
    rows='\n'.join('['+k+'] '+SOURCES[k][0]+'|'+SOURCES[k][1] for k in refs1)
    aux(c,296,'附录 F  网络资料与固定提交',P('', '''网络资料用于模块背景与接口解释，阅读日期为 2026 年 10 月 4 日。源码分析以固定提交为准，在线文档后续可能更新。具体机制以固定源码和本地实现分析展开。''',table={**T('编号与资料|地址',rows),'widths':[135,CW-135],'compact':True},diagram=D('row','资料解释从文档背景回到固定实现',['官方模块文档','固定版本源码','本文设计分析'],height=50)),'资料附录')
    refs2=['L-F','L-S','L-U','L-D','L-H','L-B','L-T','EFB','LAND','SPD','NAV','AUTH','LIC']
    rows='\n'.join('['+k+'] '+SOURCES[k][0]+'|'+SOURCES[k][1] for k in refs2)
    aux(c,297,'附录 G  本地实现与专题资料索引',P('', '''下列本地路径相对于交付目录。build-common 与 build-a339x 由叠加脚本生成。专题资料补充航图认证与资源许可的背景。

Headwind 固定提交为 41eace79ed442696a6361dc72947954c9a6cf5cb；FlyByWire 固定提交为 1bf4b8edccf84d0fb83d0eb15e42f2c773e09582。''',table={**T('资料编号与名称|路径或地址',rows),'widths':[155,CW-155],'compact':True},diagram=D('row','本地交付材料的相互对应',['扩展与适配源码','本地运行画面','本书分析与操作'],height=50)),'资料附录')
    aux(c,298,'附录 H  图件与截图来源',P('', '''设计图根据本书分析绘制，涵盖分层结构、组件、对象关系、时序、状态、公式和数值曲线。图中扩展接口均在相关正文说明其设计属性，不能据连接线推断真实系统已经接通。

操作画面来自本地 Headwind EFB，原始截图集中保留于 manual/assets/screens，文档使用的整屏及局部图另存于 manual_v2/assets。启动修复画面为 output/efb-startup-fixed.jpg。截图中的人员数量、机场、重量及日期为演示资料。

操作章节每页均有实际画面。局部图仅放大对应控件，未替换数据、重绘界面或伪造在线航图。详细图名与页码可在 figures.json 中检索。''',diagram=D('tree','书中图件的来源分类',['图件来源',['结构设计图','根据代码分析绘制','保存为 SVG'],['数值曲线','固定源码表与公式','保留节点含义'],['程序画面','本地实际浏览器','整屏或局部放大']]),table=T('画面组|对应章节|主要内容','启动与导航|18|自动开机、设置、快捷入口\n航班和文件|19|草稿、确认、导入与 OFP\n载荷和地面|20|燃油、载重、服务\n性能与报告|21|参考、失效、历史、打印\n其他专业工具|22|检查单、资料、预设与设置')),'资料附录')
    aux(c,299,'附录 I  本地启动与重建命令',P('', '''普通使用直接运行启动EFB.cmd。若在 PowerShell 中操作，先进入交付目录，再执行下列命令。Start-EFB 复用已运行的正确服务，Stop-EFB 根据本任务进程记录停止服务。

修改本地源码或叠加脚本后执行 Build-EFB，再重新打开浏览器。首次缺少依赖时构建需要安装依赖；已有 dist 的普通启动不要求重新构建。脚本错误输出位于 logs，保留完整错误文字比只记录“白屏”更有助于定位。''',code='powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\\Start-EFB.ps1\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File .\\Stop-EFB.ps1\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File .\\Build-EFB.ps1',table=T('位置|内容|用途','http://127.0.0.1:9697/|EFB 页面|日常操作\n/__health|应用身份 JSON|确认服务\nlogs/efb.stdout.log|标准输出|查看启动信息\nlogs/efb.stderr.log|错误输出|查看服务异常\nmanual_v2/render.py|文档构建脚本|重新生成说明书'),diagram=D('pipeline','普通运行与修改后重建的关系',['修改源码时构建','生成 dist','启动本地服务','打开浏览器','编辑及报告','关闭或停止服务'])),'资料附录')
    aux(c,300,'附录 J  本书贯穿样例速查',P('', '''贯穿样例用于说明同一份输入怎样流经工作台、原生摘要、地面目标和参考计算。它是人工示例，未从真实航班或机场数据库下载。使用者可以在工作台逐项录入，确认后核对下面的中间量与结果。

若使用其他重量、构型或环境条件，应按对应章节重新解释结果，不能只沿用样例数值。报告中的输入快照是确定某次结果依据的最终记录。''',table=T('项目组|输入或结果|对应说明','航班|DEMO330；ZUTF → ZSPD；ZSSS|身份与机场\n旅客与行李|250 人；80 kg；24 kg|人体 20000、行李 6000 kg\n货物与空重|2000 kg；OEW 127000 kg|载荷 28000 kg\n燃油|停机坪 30000；滑行 500 kg|起飞燃油 29500 kg\n派生重量|ZFW 155000；TOW 184500 kg|统一质量公式\n跑道|01；10°；声明距离 3500 m|扣减 0、标高 1450 ft\n天气|10° / 0 kt；15°C；1013.25 hPa|干燥、标准气压\n构型|CONF 1+F；防冰与引气关闭|支持的参考条件\n结果|V2 150.8 kt；上取整 151 kt|未校准源码表参考'),diagram=D('formula','贯穿样例的最终核对',[['重量','127000 + 250 × 104 + 2000 + 30000 − 500 = 184500 kg'],['参考插值','149 + (184500 − 180000) / 10000 × 4 = 150.8 kt']])),'资料附录')
    out=[]
    for p in AUX:
        out+=['# '+p['title'],*p['paragraphs']]
        if p.get('diagram'):out.append('!['+p['diagram']['title']+'](assets/'+p['diagram']['asset']+')')
        if p.get('table'):
            t=p['table'];rows=['|'+'|'.join(t['headers'])+'|','|'+'|'.join(['---']*len(t['headers']))+'|']+['|'+'|'.join(row)+'|' for row in t['rows']];out.append('\n'.join(rows))
        if p.get('code'):out.append('```text\n'+p['code']+'\n```')
    (ROOT/'前言与附录_可编辑.md').write_text('\n\n'.join(out),'utf-8')
    (ROOT/'supplement-data.json').write_text(json.dumps(AUX,ensure_ascii=False,indent=2),'utf-8')
