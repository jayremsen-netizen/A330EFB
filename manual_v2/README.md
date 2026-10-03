# 第二版正文与生成工程

文档标题：《A330电子飞行包系统技术方案与操作说明书》。固定 300 页：前置 10 页、设计正文 220 页、操作正文 60 页、附录 10 页。共 22 章、93 个正文小节，其中操作 30 节。

## 阅读与编辑

`说明书_可编辑正文.md` 和 `说明书_网页阅读版.html` 均包含完整前言、正文和附录。网页无需服务，直接用浏览器打开即可；相对路径 `assets/` 为网页和 Markdown 的图件目录。

章节源文件为 `ch01_02.py` 至 `ch21_22.py`，前置页和附录为 `front.py`。图文数据导出在 `book-data.json`、`supplement-data.json`。PDF、网页与 Markdown 都由同一份章节源文件生成；修改章节源文件再生成，可保持各格式一致。Markdown 也可独立编辑，独立修改不会自动回写章节源文件。

`draw.py` 生成架构、组件、数据、时序、状态、公式和算法图，同时输出矢量 SVG。操作画面来自 `../manual/assets/screens`，启动画面来自 `../output/efb-startup-fixed.jpg`；局部放大只裁取真实截图区域。`figures.json` 记录图号、标题、类型和 PDF 页码。

## 生成 PDF

经过验证的环境为 Windows、Python 3.12，使用系统微软雅黑及加粗字体。Python 库版本见 `requirements.txt`。

文档生成是可选步骤，软件构建不依赖这些 Python 库。在本仓库根目录运行：

```powershell
python -m pip install -r manual_v2/requirements.txt
python manual_v2/render.py
```

输出：`output/pdf/A330电子飞行包系统技术方案与操作说明书_重写版.pdf`，同时更新可编辑正文、网页、图件和布局记录。生成失败时会报告具体溢出页，不自动插入空白页。

其他操作系统可将 `EFB_CN_FONT` 和 `EFB_CN_BOLD_FONT` 设置为本机安装的中文 TrueType 字体完整路径；替换字体后需要重新检查排版。字体文件不随本仓库分发。

## 文档检查

```powershell
python manual_v2/verify_document.py
```

检查脚本使用 Poppler `pdftoppm`，请将其加入 PATH，或设置 `PDFTOPPM` 为该程序完整路径。检查会验证 300 页、章节数量、295 幅图件、截图覆盖、页码、正文重复及文字边界，并把全部页面转为 PNG。渲染图用于人工复核；脚本完成后 `visual_review` 保持 `pending`，应在实际看图后更新审查记录。

`evidence/structure.json` 保存结构与 PDF 摘要；`evidence/text-bounds.json` 保存文字边界；`evidence/document-quality.json` 保存本次人工图像审查范围。`layout-audit.json` 保存每页布局参数。临时全量 PNG 位于 `../tmp/pdfs/v2-full`，不放入交付压缩包。

本仓库保存现有 300 页 PDF、正文、图件和生成源码。软件通过根目录 README 中的克隆和构建命令交付，不再打包上游源码副本或运行时。手册中的早期工作区路径与当前仓库路径对应关系见 [docs/path-map.md](../docs/path-map.md)。

## 固定基线

Headwind：`41eace79ed442696a6361dc72947954c9a6cf5cb`。

FlyByWire：`1bf4b8edccf84d0fb83d0eb15e42f2c773e09582`。

网络资料与本地源码的引用映射见 `model.py` 和书末资料索引。当前实现与后端扩展设计在正文中分别标识。
