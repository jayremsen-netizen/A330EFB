"""Technical figures from public model outputs and explicit engineering configuration."""
from pathlib import Path
import json,math
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from matplotlib import font_manager
from matplotlib.patches import Rectangle,FancyArrowPatch,Polygon
ROOT=Path(__file__).resolve().parent;OUT=ROOT/'figures';OUT.mkdir(exist_ok=True)
DATA=json.loads((ROOT/'models.json').read_text('utf-8'))
if Path('C:/Windows/Fonts/msyh.ttc').exists():font_manager.fontManager.addfont('C:/Windows/Fonts/msyh.ttc')
plt.rcParams.update({'font.family':'Microsoft YaHei','font.size':11,'axes.unicode_minus':False,'svg.fonttype':'none','savefig.facecolor':'white'})
BLUE='#204e72';TEAL='#286f66';GRAY='#65727c';GOLD='#9b6a24'
def finish(fig,key):
 fig.tight_layout(pad=1.3);fig.savefig(OUT/(key+'.png'),dpi=220);svg=OUT/(key+'.svg');fig.savefig(svg);svg.write_text('\n'.join(line.rstrip() for line in svg.read_text('utf-8').splitlines())+'\n','utf-8');plt.close(fig)
def canvas():
 fig,ax=plt.subplots(figsize=(8,3.3));ax.set(xlim=(0,100),ylim=(0,100));ax.axis('off');return fig,ax
def box(ax,x,y,w,h,text,color='white'):
 ax.add_patch(Rectangle((x,y),w,h,fc=color,ec=GRAY,lw=1));ax.text(x+w/2,y+h/2,text,ha='center',va='center',fontsize=10)
def arrow(ax,a,b,text='',color=BLUE):
 ax.add_patch(FancyArrowPatch(a,b,arrowstyle='->',mutation_scale=12,lw=1.3,color=color))
 if text:ax.text((a[0]+b[0])/2,(a[1]+b[1])/2+3,text,ha='center',fontsize=9,color=color,bbox=dict(facecolor='white',edgecolor='none',pad=2))
def panels(key,groups,foot=''):
 fig,ax=canvas();n=len(groups)
 for i,(head,body) in enumerate(groups):
  w=94/n-2;x=3+i*94/n;box(ax,x,26,w,61,head+'\n\n'+body,'#f5f6f7')
 if foot:ax.text(50,10,foot,ha='center',fontsize=10)
 finish(fig,key)
def build():
 fig,ax=canvas()
 for y,label in [(78,'React 页面  航班  起飞  燃油  配载  着陆  资料与地服'),(56,'共享 Flight 状态  确认签名  草稿恢复  地面实际状态'),(34,'纯 TypeScript 数值内核  参数版本  独立输入和结果快照'),(12,'浏览器宿主适配  SimVar 与 Store  本机文件与静态资源')]:box(ax,3,y,94,16,label,'#f5f6f7')
 for y in [78,56,34]:arrow(ax,(50,y),(50,y-6))
 finish(fig,'architecture')
 panels('scope',[('工程性能','起飞约束与推力\n燃油预算与储备\n纵向配载重心\n目的地及备降着陆'),('交互演示','航班与草稿\n实际加油与装载\n资料与检查单\n六套自动工作流'),('适用身份','A330-941／Trent 7000\n工程假设与样例\n固定上游源码引用\n投标演示用途')],'计算可行性限定在已声明的工程模型内')
 fig,ax=canvas();box(ax,4,32,32,48,'本机浏览器\nReact UI 与本地存储\n纯数值内核\n演示运行模型','#f5f6f7');box(ax,60,32,34,48,'Node 静态服务\n127.0.0.1:9698\n构建资源与版本清单\n/__health 健康接口','#f5f6f7');arrow(ax,(36,63),(60,63),'本机 HTTP');arrow(ax,(60,45),(36,45),'页面和资源');ax.text(50,15,'首次获取依赖需要网络；已构建核心流程使用本机资源',ha='center',fontsize=10);finish(fig,'deployment')
 panels('assembly',[('来源引用','Headwind 固定提交\n41eace79…\nFlyByWire 固定提交\n1bf4b8ed…'),('生成装配','upstreams.py 获取\nprepare.py 准备\nintegrate_extensions.py\n叠加本地扩展'),('本项目成果','local-extensions\nlocal-efb\n测试和演示脚本\n可编辑技术资料')],'上游源码不复制进受跟踪的本项目成果')
 panels('schema',[('Flight','身份与机场\n总载荷与燃油\n起飞跑道和天气\n构型与资料复核'),('PlanningInputs','fuel 分段预算\nloading 分舱计划\nlanding 独立条件\nloadingAccepted'),('结果快照','input 输入副本\nmodel 参数版本\nstatus 与诊断\nsignature 和时间')])
 panels('units',[('输入与显示','kg 或 lb\nm 或 ft\nhPa 或 inHg\n有限数或空值'),('内部基准','质量 kg\n距离 m／航路 NM\n气压 hPa\n空速 kt'),('动力求解','速度换算 m/s\n力 N  力矩 kg·m\n时间 s\nCAS／TAS／地速分离')],'界面换单位不改变内部质量和物理输入')
 fig,ax=canvas();box(ax,3,69,27,20,'可编辑草稿');box(ax,37,69,27,20,'重量已确认');box(ax,71,69,27,20,'当前有效结果');arrow(ax,(30,79),(37,79),'校验');arrow(ax,(64,79),(71,79),'计算');box(ax,37,22,27,20,'输入或目标已变化');arrow(ax,(84,69),(64,34),'撤销出口');arrow(ax,(50,42),(17,69),'保留输入');ax.text(50,7,'配载确认另行绑定分舱、燃油及目的地与备降情景',ha='center',fontsize=10);finish(fig,'confirmation')
 panels('draft-file',[('完整航班文件','schemaVersion = 1\nFlight 原始对象\n有限数和完整文本\n严格校验后导入'),('草稿交换文件','format =\na330efb-flight-draft\nformatVersion = 1\nexportedAt 与 Flight'),('草稿恢复语义','null 恢复为空数值\n保留未完成文本\n撤销重量与配载确认\n补齐后才能计算')],'文件上限 512 KiB；异常结构拒绝，原航班保留')
 panels('interfaces',[('数值接口','calculateTakeoff\ncalculateFuelPlan\ncalculateLoading\ncalculateLanding'),('协调接口','editFlight／confirmFlight\nderivePlanning\nacceptLoading\nplanningBundle'),('宿主接口','SimVar 读写\nStore 同步\nruntime.command\n本机文件与报告')])
 fig,ax=canvas();ax.plot([10,90],[36,36],color=GRAY);box(ax,33,37,34,19,'');ax.text(59,40,'质量 m',ha='center',fontsize=9);arrow(ax,(50,47),(86,47),'推力 T',BLUE);arrow(ax,(49,46),(16,46),'阻力 D + 滚阻',GOLD);arrow(ax,(50,48),(50,88),'升力 L',TEAL);arrow(ax,(50,43),(50,6),'重力 mg',GRAY);ax.text(12,24,'地面正压力 N = max(0, mg − L)',fontsize=10);ax.text(12,12,'坡度分力与沿跑道地速参与纵向积分',fontsize=10);finish(fig,'forces')
 h=np.linspace(-1000,8000,100);hm=h*.3048;p=101325*(1-.0065*hm/288.15)**(9.80665/(287.05287*.0065));rho=p/(287.05287*288.15)
 fig,ax=plt.subplots(figsize=(8,4));ax.plot(h,rho,color=BLUE);ax.set(xlabel='压力高度 (ft)',ylabel='等温示意密度 (kg/m³)');ax.grid(alpha=.2);ax.set_title('通用大气关系示意  固定温度 15 °C');finish(fig,'atmosphere')
 toga=DATA['takeoffToga']['solution'];fig,ax=plt.subplots(figsize=(8,4.5))
 for key,label,color in [('accelerateStop','加速停止',GOLD),('continueTakeoff','单发继续',TEAL)]:
  a=toga['trajectory'][key];ax.plot([x['distanceM'] for x in a],[x['speedKt'] for x in a],label=label,color=color)
 ax.set(xlabel='按地速积分的距离 (m)',ylabel='校准空速 CAS (kt)');ax.legend();ax.grid(alpha=.2);finish(fig,'takeoff-trajectories')
 fig,ax=canvas()
 for y,name,length in [(73,'TORA',3500),(47,'TODA',3500),(21,'ASDA',3500)]:box(ax,14,y,80,13,name+'  3500 m','#eef1f3');box(ax,4,y,10,13,'扣减');ax.text(4,y+17,'共同入口原点' if y==73 else '',fontsize=9)
 ax.text(50,3,'当前样例三项相同；程序分别比较 TOR、TOD 和 ASD',ha='center',fontsize=10);finish(fig,'runway')
 fig,ax=plt.subplots(figsize=(8,4));temp=np.arange(15,71);ax.plot(temp,np.maximum(.75,1-.006*(temp-15)),color=BLUE);ax.set(xlabel='工程假设温度 (°C)',ylabel='相对 TOGA 推力比例');ax.grid(alpha=.2);ax.set_title('实际温度 15 °C 下的线性工程减推假设');finish(fig,'flex')
 panels('solver',[('候选空间','V1 间隔 0.5 kt\nTOGA 质量间隔 100 kg\nFLEX 温度间隔 1 °C'),('约束比较','TOR ≤ TORA\nTOD ≤ TODA\nASD ≤ ASDA\n梯度 ≥ 2.4%'),('选择规则','V1 最小化最高利用率\nTOGA 完整质量网格\nFLEX 自最高温度回查')],'有限网格内求解，不假设离散可行性单调')
 fuel=DATA['fuel'];labels=['滑行','航程','应急','备降','最终储备','额外'];keys=['taxiKg','tripKg','contingencyKg','alternateKg','finalReserveKg','extraKg'];tot=fuel['totals']
 fig,ax=plt.subplots(figsize=(8,4.2));values=[tot[k] for k in keys];ax.barh(labels,values,color=[GRAY,BLUE,GOLD,TEAL,GRAY,GOLD]);ax.set(xlabel='燃油 (kg)');ax.invert_yaxis();ax.grid(axis='x',alpha=.2)
 for i,v in enumerate(values):ax.text(v+80,i,f'{v:,.1f}',va='center',fontsize=10)
 ax.set_xlim(0,max(values)*1.18);finish(fig,'fuel-budget')
 panels('fuel-segments',[('主航程','爬升 20 min／110 NM\n巡航 900 NM／450 kt\n下降 20 min／100 NM\n巡航油耗 5400 kg/h'),('备降航程','复飞 10 min／35 NM\n巡航 25 NM／250 kt\n下降 8 min／25 NM\n巡航油耗 5000 kg/h'),('录入关系','主航段 1–50 条\n备降航段 1–50 条\n距离与阶段不重计\n迎风正  顺风负')],'默认距离、时间和油耗均为手工演示样例')
 fig,ax=plt.subplots(figsize=(8,4));steps=[('RAMP',155000+21257),('TOW',155000+21257-500),('目的地',fuel['planned']['destinationLandingMassKg']),('备降',fuel['planned']['alternateLandingMassKg'])];ax.plot([a for a,b in steps],[b/1000 for a,b in steps],'o-',color=BLUE);ax.set(ylabel='名义阶段质量 (t)');ax.grid(alpha=.2)
 for i,(_,v) in enumerate(steps):ax.annotate(f'{v:,.0f} kg',(i,v/1000),xytext=(0,10),textcoords='offset points',ha='center',fontsize=10)
 finish(fig,'mass-ledger')
 panels('fuel-adoption',[('当前计划','rampKg 来自 Flight\n按当前实际目标预算\n差额与容量独立检查'),('可采用建议','六项之和向上取整\n建议本身质量可行\n只修改计划 rampKg'),('后续动作','配载重新确认\n重量重新确认\n地面另行实际加油\n性能重新计算')],'当前计划不足时也可以采用一份可行的建议')
 lp=DATA['loadingParameters'];fig,ax=plt.subplots(figsize=(8,4.5));ax.set(xlim=(0,50),ylim=(0,4));ax.axhline(2.2,color=GRAY)
 for i,s in enumerate(lp['cabin']):ax.scatter(s['armM'],2.3,s=85,color=BLUE);ax.text(s['armM'],3.05,f"客舱 {s['id']}\n{s['armM']} m",ha='center',fontsize=10)
 for i,s in enumerate(lp['holds']):ax.scatter(s['armM'],1.5,s=85,color=GOLD);ax.text(s['armM'],.55,f"{s['id']}\n{s['armM']} m",ha='center',fontsize=10)
 ax.axvspan(29,36,color=TEAL,alpha=.12);ax.text(32.5,3.75,'LEMAC 29 m  MAC 7 m',ha='center',fontsize=10);ax.set(xlabel='从工程机鼻原点向后的纵向力臂 (m)');ax.set_yticks([]);finish(fig,'stations')
 stations=DATA['loading']['stations'];fig,ax=plt.subplots(figsize=(8,4.6));ax.barh([s['id'] for s in stations],[s['momentKgM']/1e6 for s in stations],color=BLUE);ax.set(xlabel='纵向质量矩 (百万 kg·m)');ax.invert_yaxis();ax.grid(axis='x',alpha=.2);finish(fig,'moments')
 fig,ax=plt.subplots(figsize=(8,4));names=['FWD','AFT','BULK'];caps=[20000,20000,4836];bags=[24*v/44836 for v in caps];ax.bar(names,bags,label='行李',color=GOLD);ax.bar(names,[v-b for v,b in zip(caps,bags)],bottom=bags,label='货物',color=BLUE);ax.set(ylabel='合并货舱质量 (kg)');ax.legend();ax.grid(axis='y',alpha=.2);ax.set_title('1 人 24 kg 行李加 44812 kg 货物的满载分配');finish(fig,'allocation')
 fig,ax=plt.subplots(figsize=(8,4.5));env=lp['envelope'];ax.fill([p['forward'] for p in env]+[p['aft'] for p in reversed(env)],[p['massKg']/1000 for p in env]+[p['massKg']/1000 for p in reversed(env)],color=BLUE,alpha=.12);points=DATA['loading']['points']
 offsets={'zfw':(-28,-17),'ramp':(-38,16),'takeoff':(10,-7),'landing':(10,9)}
 for i,(label,v) in enumerate(points.items()):
  if v:ax.scatter(v['cgPercentMac'],v['massKg']/1000,color=[GRAY,BLUE,GOLD,TEAL][i]);ax.annotate(label.upper(),(v['cgPercentMac'],v['massKg']/1000),xytext=offsets[label],textcoords='offset points',fontsize=10,arrowprops=dict(arrowstyle='-',lw=.6,color=GRAY))
 ax.set(xlabel='纵向重心 (% MAC)',ylabel='质量 (t)');ax.grid(alpha=.2);ax.set_title('模型假设包线与当前阶段计算点');finish(fig,'envelope')
 landing=DATA['landing'];s=landing['solution'];fig,ax=plt.subplots(figsize=(8,4));points=s['trajectory'];ax.plot([p['distanceM'] for p in points],[p['heightM'] for p in points],color=TEAL);ax.set(xlabel='从着陆阈值累计距离 (m)',ylabel='相对跑道高度 (m)');ax.grid(alpha=.2);ax.set_title('工程空中段  制动延迟与滑跑');finish(fig,'landing-profile')
 fig,ax=plt.subplots(figsize=(8,4));brake=[p for p in points if p['phase']=='braking'];ax.plot([p['timeS'] for p in brake],[p['groundSpeedKt'] for p in brake],color=TEAL);ax.set(xlabel='阈值通过后的累计时间 (s)',ylabel='地速 (kt)');ax.grid(alpha=.2);ax.set_title('MED 工程制动轨迹  距离积分使用地速');finish(fig,'landing-braking')
 fig,ax=plt.subplots(figsize=(8,3.5));parts=[s['airDistanceM'],s['delayDistanceM'],s['brakingDistanceM'],s['requiredDistanceM']-s['unfactoredDistanceM']];start=0
 for value,label,color in zip(parts,['空中段','制动延迟','滑跑','系数余量'],[BLUE,GOLD,TEAL,GRAY]):ax.barh(['工程需求'],[value],left=start,color=color,label=label);start+=value
 ax.axvline(3000,color='black',ls='--',label='LDA 3000 m');ax.set(xlabel='距离 (m)',xlim=(0,3200));ax.legend(loc='center left',bbox_to_anchor=(1.01,.5),fontsize=9);finish(fig,'landing-distance')
 panels('landing-input',[('独立着陆条件','目的地或备降机场\nLDA 与跑道航向\n独立天气站和来源\n构型 制动与反推'),('共享质量来源','ZFW + 计划剩余油\n燃油预算可行\n目的地与备降CG\n有效配载及重量确认'),('可计算包线','120–191 t\nLDA 300–6000 m\n干或湿  坡度 ±2%\n压力高度 −1000–8000 ft')])
 panels('landing-status',[('无解状态','invalid 缺项或错配\nunsupported 超包线\n无 solution\n不保留旧图与速度'),('模型诊断','engineering-infeasible\n距离超过 LDA\n保留完整诊断轨迹\n标明诊断速度'),('模型可行','engineering-feasible\n距离约束满足\n参数与来源可追溯\n限定工程模型含义')])
 fig,ax=canvas();roles=[('页面',12),('共享计划',38),('运行模型',65),('回执',90)]
 for label,x in roles:ax.text(x,93,label,ha='center');ax.plot([x,x],[10,88],ls='--',color=GRAY,lw=.7)
 for y,a,b,text in [(78,12,38,'核对已确认目标'),(61,38,65,'提交不可变目标快照'),(44,65,90,'受理  执行  完成'),(27,38,90,'比较当前操作目标')]:arrow(ax,(a,y),(b,y),text)
 finish(fig,'command-sequence')
 fig,ax=plt.subplots(figsize=(8,4));ax.step([0,1,3,4],[30000,21257,21257,21257],where='post',label='当前计划',color=GOLD);ax.plot([0,1,3,4],[5000,13333,30000,30000],label='原命令实际加油',color=BLUE);ax.axhline(30000,ls='--',color=GRAY,label='提交时目标');ax.set(xlabel='演示过程时间 (s)',ylabel='燃油 (kg)');ax.legend();ax.grid(alpha=.2);finish(fig,'old-plan')
 panels('ground-readiness',[('计划确认','Flight 校验通过\n签名匹配当前输入\n无存储冲突\n地面目标未另改'),('实际装载','燃油差额 < 0.01 kg\n人数差额 = 0\n货物差额 < 0.01 kg\n按当前计划比较'),('运行准备','没有执行中请求\n没有活动设备故障\n仍在停机位\nGPU 另作推出联锁')],'推出为演示动作；不代表工程计划获得运行放行')
 panels('refresh',[('刷新前','已确认计划\n实际状态与请求\n当前故障和回执'),('刷新后','保留航班与配载确认\n5000 kg  0 人  0 货物\nGPU 断开  请求清除\n场景时间固定0800Z'),('显式恢复','状态栏恢复入口\n预设页说明复位\n核对确认计划\n选择恢复准备预设')],'内存运行过程不持久化，刷新不重复发出旧命令')
 panels('resources',[('天气','内置机场样例\n原文 时间和来源\n显式采用\n手工修改重新标源'),('资料阅读','本地PDF PNG JPEG\n20 MB 上限\n缩放 旋转与翻页\n收藏目录持久化'),('检查单与设置','人工确认检查项\n新航班清空\n语言主题与单位\n宿主能力明确隔离')])
 panels('host-map',[('计划映射','SimBrief Store\n本地签派摘要\n重量与目标燃油\n有效预计到达数据'),('实际映射','DemoRuntime 状态\n油箱体积与质量\n旅客位标志和货舱\n当前质量与重心'),('可见身份','浏览器演示模式\n样例而非实况\n已连接／未接入\n版本与健康检查')])
 panels('report',[('重算时的依据','完整 Flight\n当前航路与分舱\n独立着陆条件\n模型版本与来源'),('同一快照的输出','JSON 数值与轨迹\nHTML 图形与诊断\n质量 燃油 重心\n工程约束和状态'),('出口控制','过期结果撤销\n冲突时禁止出口\n无效前置条件阻断\n不可行结果标诊断')],'起飞报告独立保存；综合计划报告含燃油 配载与着陆')
 panels('verification',[('纯模型验证','独立解析算例\n质量和容量守恒\n风温坡度趋势\n完整离散搜索边界'),('页面验证','真实导入和导出\n确认与结果失效\n刷新 故障与旧命令\n六套自动演示'),('交付验证','固定上游引用\n锁定依赖安装\n构建身份和健康\nWord 与程序核对')],'测试验证实现与工程方法一致，不证明真实飞机性能精度')
 panels('capabilities',[('已接入本地能力','航班与性能流程\n资料阅读与样例天气\n检查单人工操作\n地服 故障和预设'),('外部能力入口','SimBrief 在线签派\nNavigraph 商业航图\nSimBridge 飞机宿主\n在线ATC与遥测'),('演示隔离','核心流程不依赖账号\n不发送真实飞机命令\n未接入能力明确标记\n模拟器设置不冒充效果')])
 print('Technical figure pairs:',len(list(OUT.glob('*.png'))))
if __name__=='__main__':build()
