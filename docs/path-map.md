# 手册工作区路径与仓库路径

随仓库保存的 300 页手册记录了本地演示的设计与操作基线。其正文中的 `headwind/` 是当时工作区名称；独立 A330EFB 仓库将本地开发代码和上游引用拆开，映射如下。

| 手册中的路径 | 当前仓库 |
|---|---|
| headwind/local-efb | local-efb |
| headwind/local-extensions | local-extensions |
| headwind/hdw-* | upstream/headwind/hdw-* |
| headwind/flybywire | upstream/flybywire |
| headwind/build-common | build-common，构建生成且被忽略 |
| headwind/build-a339x | build-a339x，构建生成且被忽略 |
| headwind/local-efb/public | local-efb/public，构建生成且被忽略 |
| setup_overlay.py、prepare_final_host.py | scripts/prepare.py |
| integrate_extensions.py | scripts/integrate_extensions.py |
| manual/evidence、演示/evidence 中的测试输出 | 新测试输出为 .artifacts；历史摘要为 docs/verification |

文档中的上游提交、计算示例、界面工作流保持相同。新的下载及构建操作以仓库 README 为准。
