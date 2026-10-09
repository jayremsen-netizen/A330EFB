# A330EFB 统一Word技术说明书

[Word技术说明书3.0](../output/word/A330电子飞行包系统技术方案与操作说明书.docx)对应软件1.3.1，统一包含总体架构、共享数据与接口、四个工程模块、地面运行、关键技术、操作使用和六套自动工作流。采用自然分页，现行行为不再要求读者拼接早期主手册与新增功能补充材料。

本版共13章、59节，每节配图，18个操作及演示小节均有真实程序画面。图形包括受力、站位、质量矩、CG包线、速度距离、燃油账、着陆剖面和接口时序。正文没有叙述性表格，关键公式使用可编辑Word数学对象。工程假设与来源在正文明确说明，测试通过不作为真实A330性能校准结论。

## 正文与生成

- `current/manuscript.py`及`current/manuscript.json`：当前结构化正文及生成源。
- `current/diagrams.py`及`current/figures/`：图形生成源与PNG、可编辑SVG。
- `current/assets/`：实际程序画面，使用浏览器采集。
- `current/models.json`：从程序公共输出采集的数值算例。
- `current/capture.cjs`、`model_data.cjs`及`capture.json`：隔离上下文的采集脚本与记录。
- `current/update_references.py`：演示可见章节引用映射。
- `build_docx.py`：Word正文、样式、原生公式、图注、书签和目录。
- `page-map.json`及`verification.json`：本版校阅页码和验证摘要。

正文、图形和截图均已提交，其他开发者生成Word无需重新采集界面。在仓库根目录执行：

```sh
python -m pip install -r manual_word/requirements.txt
python manual_word/build_docx.py --page-map manual_word/page-map.json
```

修改正文或图形后执行：

```sh
python manual_word/current/manuscript.py
python manual_word/current/diagrams.py
python manual_word/build_docx.py
```

需要更新现行程序画面时，先按根目录README构建并启动软件，再运行`node manual_word/current/capture.cjs`。不同服务地址可设置`EFB_BASE_URL`；采集上下文独立，不覆盖普通航班。数值算例通过`node manual_word/current/model_data.cjs`采集，讲解稿使用`python 演示/build_guide.py`生成。

## 排版校阅

本版保留A4版式与黑色标题，中文正文11pt。输出位于`output/word/`。字体替换后应更新整个目录并检查换行、公式、图注和截图可读性。

DOCX通过LibreOffice或Word导出校阅PDF，再逐页渲染PNG检查。`current/inspect_current.py <校阅目录>`读取PDF书签、检查文字边界，并生成不缩放的逐页检查拼图及页码映射。校阅PNG和PDF保存在忽略的`.artifacts/`，不作为用户交付文件。确认页码后用`--page-map`重建目录。

## 历史版本

[技术手册2.0](../output/word/history/A330EFB技术手册2.0.docx)及原有`manuscript.json`、`assemble.py`、`editorial.py`、`operations.py`与`demo_chapter.py`保留为早期基线，不作为当前行为说明。

使用`python manual_word/build_docx.py --manuscript manual_word/manuscript.json`可重建历史正文；该命令覆盖主输出，使用前应另存当前成果。历史300页PDF和正文保留在`manual_v2/`与`output/pdf/`。当前投标演示采用统一手册3.0，软件、工程参数和文档版本分别管理。
