# A330EFB Word 技术说明书

[下载 Word 文件](../output/word/A330电子飞行包系统技术方案与操作说明书.docx)

本文档为软件早期基线的技术说明书 2.0。软件 1.1 的性能范围、资料阅读、天气、地服故障和预设等变化见 [1.1 操作补充说明](../docs/implementation/1.1操作补充说明.md)，设计差异见 [1.1 设计变更说明](../docs/implementation/1.1设计变更说明.md)。现场讲解使用版本与章节号，不使用旧 PDF 页码。

本版采用自然分页，本次校阅排版为 142 页，包含系统架构、数据与接口、业务模块、关键技术、操作使用和自动演示。正文、表格、公式文字、标题及目录均可在 Word 中编辑。110 幅图包括部署图、UML 时序与状态图、数据结构图、质量组成图、性能曲线、下降剖面、跑道几何图和真实程序截图。99 个小节均配图，36 个操作小节均有程序截图。正文保留 17 张字段或数值对照表。

## 文件组织

- `manuscript.json`：本版完整结构化正文，可以直接用于生成 Word。
- `editorial.py`、`operations.py`、`demo_chapter.py`：设计说明修订、操作正文和演示章节。
- `assemble.py`：从原有技术材料组装本版正文，选取图和必要表格。
- `figures.py`：工程图生成代码；`figures/` 同时保留 PNG 和可编辑 SVG。
- `assets/`：自动演示的真实程序截图。其他界面截图引用仓库内已有素材。
- `build_docx.py`：Word 样式、图文排版、目录、书签和来源链接。
- `page-map.json`：本次校阅环境中核对过的目录页码。Word 换字体或重新排版后，应更新整个目录。
- `inspect_document.py`：读取校阅 PDF 的标题页码，检查边界并生成不缩放的逐页检查拼图。
- `verification.json`：本次文档结构、逐页校阅结果及 Word 文件摘要。

## 生成 Word

使用 Python 3.12 或更高版本，在工程根目录执行：

```sh
python -m venv .venv-docs
# Windows
.venv-docs\Scripts\activate
# Linux 或 macOS 使用 source .venv-docs/bin/activate
python -m pip install -r manual_word/requirements.txt
python manual_word/build_docx.py --page-map manual_word/page-map.json
```

输出到 `output/word/`。字体采用宋体、黑体及常见西文字体；排版核对环境为 Windows。缺少中文字体的系统需配置相应字体替代，并在 Word 或兼容排版软件中更新目录、检查换行和分页。

调整正文或重新绘制工程图时，先执行：

```sh
python manual_word/assemble.py
python manual_word/build_docx.py --page-map manual_word/page-map.json
```

工程图默认使用 Microsoft YaHei。更换图字体可在 `figures.py` 中设置 `font.family`，重新生成后应检查标签、连线与边界。程序截图保留实际软件画面，不由绘图代码模拟生成。

## 校阅与版本

在 Word 中选中目录后选择“更新整个目录”。导出校阅 PDF，核对每页的标题、图注、表头、页码及长字段；尤其检查跨页表格与操作截图的可读性。若需提取新页码，先将 PDF 和按页输出的 PNG 放入同一目录，再运行 `python manual_word/inspect_document.py <校阅目录>`，把其 `page-map.json` 用于重新构建。

本版软件基线为 `f528013`，上游基线见工程 `config/upstreams.json`。网页文档用于说明产品概念，固定源码和本项目实现决定具体行为。旧版 300 页 PDF 与旧正文留在 `manual_v2/` 和 `output/pdf/`，仅作历史版本保存。
