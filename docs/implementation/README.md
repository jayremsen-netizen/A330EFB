# A330EFB 1.1 实施交付

本目录将实施依据、任务完成条件和交付证据一起版本化。

- [完善方案](方案.md)：目标、系统职责、改造设计与范围。
- [实施任务书](实施任务书.md)：T01–T12、依赖、完成条件及证据。
- [任务清单](tasks.json)：任务书使用的结构化状态源。
- [设计变更说明](1.1设计变更说明.md)：数据、存储、宿主和本地运行模型的实际实现。
- [操作补充说明](1.1操作补充说明.md)：1.1 新增行为与真实程序截图。
- [验收记录](../verification/1.1验收记录.md)：复盘问题处置、验证结果与保留范围。

Word 交付文件位于 `output/word`。在根目录按以下方式重新生成两个文档：

```sh
python -m pip install -r manual_word/requirements.txt
python docs/implementation/build_documents.py
```

生成器从 `方案.md` 与 `tasks.json` 读取内容，输出 `实施任务书.md`、`A330EFB投标演示版完善方案.docx` 和 `A330EFB投标演示版实施任务书.docx`。改变任务状态后应重新生成，并用 Word 或兼容软件核对换行与分页；宋体和黑体缺失时会发生字体替换。

软件构建和全部检查以根目录 README 为准。只运行某套浏览器回归时，可以使用：

```sh
npm run test:ui -- reliability-ui-tests.cjs
```

不指定套件时执行全部四类浏览器检查。证据截图由测试实际操作后获取，不由静态绘图模拟界面。`evidence` 只保存选定的交付画面，原始执行记录和完整截图在 `.artifacts`；远端 CI 保留对应作业附件。
