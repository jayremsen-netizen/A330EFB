# 起飞性能工程演示

目标：A330EFB 1.2 投标演示。新增独立工程模型，保留原源码 V2 参考入口。

- [实施方案](起飞性能实施方案.md)
- [任务状态](tasks.json)
- [资料与模型边界](资料与模型边界.md)
- [模型说明](模型说明.md)
- [操作说明与实际画面](操作说明.md)
- [验收记录](验收记录.md)
- [Word方案](../../output/word/A330EFB起飞性能工程演示实施方案.docx)

`local-extensions/takeoff` 保存参数包与纯计算内核；工程页面与旧V2参考入口分开。新自动场景为 `takeoff`，地址 `http://127.0.0.1:9698/demo.html?autoplay=1&scenario=takeoff`。

在仓库根目录重建方案 Word：

```sh
python -m pip install -r manual_word/requirements.txt
python docs/takeoff/build_document.py
```

生成器读取本目录方案正文和 `evidence/model-sample.json`，绘制系统结构、受力、跑道约束与实际模型轨迹。样例来自浏览器实际导出的结果；图和文本可追溯到同一版本。Word按A4自然分页，宋体和黑体缺失时需要检查替代字体排版。软件构建与检查命令见根目录README。

证据中的页面是程序实际运行截图；`document-review.json`记录Word逐页检查结果。完整测试原始输出由 `.artifacts` 和远端CI附件保存。

本目录的模型验收用于证明工程假设下的软件正确性，不等于真实 A330 性能校准。
