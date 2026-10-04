"""Documentation for the runnable demonstration, with actual application captures."""
import shutil
from editorial import CHAPTER_OPENINGS

DATA=[
('演示启动与控制台','final-1920x1080.png',
 '演示控制台把实际 EFB 嵌入左侧工作区，右侧显示当前步骤的说明、观察点和业务数值。下方时间轴用于定位，顶部场景选择器切换三套工作流。控制器通过桥接接口操作真实页面，屏幕数值来自 EFB 当前状态。',
 ['构建完成后运行 npm run demo，或双击“启动投标演示.cmd”。','打开 http://127.0.0.1:9698/demo.html?autoplay=1，等待 EFB 就绪后自动开始。','使用“暂停演示”接管界面，使用“继续演示”恢复播放。','按需要开启全屏、调整速度或选择中文语音。语音可用性取决于浏览器和本机语音库。'],
 '演示使用独立的浏览器存储前缀 A339_BID_DEMO。普通工作台与演示的航班记录分开保存；演示中的重播只重建当前演示状态。'),
('典型航班准备','preflight-11-calculate.png',
 '“典型航班准备”包含 20 步，按建档、重量、页面联动、参考核算、报告和变更复核的顺序播放。标准速度约需 6 分钟。样例航班 DEMO330 从 ZUTF 至 ZSPD，250 名旅客及相关行李、货物构成 28 000 kg 载荷。',
 ['选择“典型航班准备”，从第 1 步开始播放。','在导入及重量确认步骤观察航班、人数、ZFW 与 TOW 的变化。','在签派、载重和燃油步骤核对同一航班是否贯穿各页面。','到达核算步骤后暂停，检查 TOW 184 500 kg、V2 参考 150.8 kt。','继续查看历史、报告、变更复核、检查单和下降顶点。'],
 '单步动作完成后，控制器检查实际页面和业务快照，再进入停留计时。输入未生效或页面未出现时，不会仅靠讲解文本宣告该步骤成功。'),
('地面变更与重算','preflight-15-stale.png',
 '“地面变更与重算”包含 7 步，演示地面燃油目标从 30 000 kg 增至 31 000 kg 后的结果生命周期。重点是旧结果失效、变化回读和重新确认之间的关系。',
 ['选择“地面变更与重算”并播放。','观察燃油目标变化后，旧结果显示为过期。','在回读步骤核对工作台停机坪燃油更新为 31 000 kg。','重新确认和计算后，核对 TOW 185 500 kg、V2 参考 151.2 kt。','打开新的报告，检查输入快照与此次变更一致。'],
 '“结果过期”来自输入签名或地面目标标记的变化。控制器必须完成回读、确认和计算，才会再次获得可保存及导出的当前结果。'),
('专业工具巡览','tools-06-landing.png',
 '“专业工具巡览”包含 7 步，在同一控制台依次进入原生载重、燃油、检查单、下降顶点和着陆工具。该场景用于说明页面覆盖范围及各工具的数据含义，标准速度约 2 至 3 分钟。',
 ['选择“专业工具巡览”，观察载重与燃油页面的计划摘要。','到达检查单步骤时，查看人工项目状态的变化。','在下降顶点步骤核对 35 000 ft 至 3 000 ft、3° 的输入及约 100 NM 的结果。','在着陆工具步骤查看质量、跑道条件和三种自动刹车对应的距离。'],
 '下降顶点与着陆工具使用独立输入。着陆页面沿用固定上游算法，其重量修正问题与参考范围见第11章，巡览画面不改变该算法的适用边界。'),
('暂停接管与步骤定位','recovered-step.png',
 '暂停时控制台保留 EFB 交互，讲解计时停止，使用者可以修改表单或打开其他页面。步骤定位需要重建目标步骤之前的状态，控制器因此创建新的嵌入实例，再顺序执行到所选步骤。',
 ['播放时点击“暂停演示”，在 EFB 中操作需要讲解的字段。','点击下方步骤编号或“下一节”“上一节”，等待目标步骤准备完成。','需要回到标准样例时点击“重播”，避免沿用临时修改。','页面显示步骤执行错误时，按错误提示检查当前输入，再重播或重新定位。'],
 '每次定位分配新的运行代号，并核对 iframe 身份。旧页面上尚未结束的异步动作即使返回，也不能继续推进新场景。动作失败时控制台保留失败状态，使用者可在当前界面检查原因。'),
('报告预览与演示结束','report-controls.png',
 '演示报告由 EFB 的当前有效结果生成。报告预览中包含航班、质量、参考速度、输入快照及资料版本；控制台还提供实际航班 JSON、结果 JSON 和 HTML 文件的下载入口。',
 ['在报告步骤暂停，核对航班身份和计算数值。','使用预览窗口的“保存 HTML”保存核算单，或关闭预览后从“演示资料”下载其他业务文件。','需要现场接管时保持暂停；需要连续展台播放时开启循环。','结束后关闭页面，运行“停止投标演示.cmd”，或在前台 npm 终端按 Ctrl+C。'],
 '业务文件由当前有效状态生成。没有有效结果时，结果与报告出口不可用。保存文件后可独立打开 HTML 核对，不能以下载按钮出现代替对文件内容的检查。'),
]

def chapter(work,root):
    assets=root/'assets';assets.mkdir(exist_ok=True)
    sections=[]
    for i,(title,name,intro,steps,note) in enumerate(DATA,1):
        src=work/'.artifacts/demo'/name
        if not src.exists():src=work/'演示/evidence'/name
        dst=assets/('demo-'+name)
        if src.exists():shutil.copy2(src,dst)
        if not dst.exists():raise FileNotFoundError(dst)
        sections.append(dict(id=f'23.{i}',title=title,scope='',refs=['DEMO','L-S'],blocks=[
          dict(type='paragraph',text=intro),dict(type='steps',items=steps),
          dict(type='figure',kind='screen',path=str(dst.relative_to(work)),caption=title+'实际界面'),
          dict(type='paragraph',text=note)]))
    return dict(number=23,title='自动演示与典型工作流',opening=CHAPTER_OPENINGS[23],sections=sections)
