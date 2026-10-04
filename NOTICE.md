# 来源、版本与署名

A330EFB 包含本地浏览器适配、航班业务扩展、自动演示控制台、构建脚本和中文技术说明书。Headwind 与 FlyByWire 源码通过 Git 子模块引用，未作为源码副本收入本仓库。

| 上游 | 版本与许可入口 |
|---|---|
| Headwind Simulations aircraft | [固定提交与 README 许可说明](https://github.com/headwindsim/aircraft/tree/41eace79ed442696a6361dc72947954c9a6cf5cb) |
| FlyByWire Simulations aircraft | [固定提交与许可](https://github.com/flybywiresim/aircraft/tree/1bf4b8edccf84d0fb83d0eb15e42f2c773e09582) |
| npm 依赖 | 名称、版本与完整性见 package.json、package-lock.json；各包原始许可位于安装后的包目录 |

构建时使用上游 EFB 组件、布局、字体和本机配置；V2 表由 Headwind 的 NXSpeeds.ts 提取。生成目录不纳入 Git。运行截图展示的是这些组件与本地扩展组合后的实际界面，保留项目来源标识。

本地源码使用 GNU GPL version 3。Headwind 固定版本 README 将原始文本源码及其编译产物列为 GPLv3，将艺术资源列为 CC BY-NC-SA 4.0；FlyByWire README 将原始源码列为 GPLv3、原始三维资源列为 CC BY-NC 4.0，并另列 Microsoft Game Content Usage Rules 适用内容。仓库引用和本地构建不会改变其原始许可，引用方式也不授予受限资源的商业使用许可。此项目没有包含三维飞机模型，也不代表 Airbus、Headwind、FlyByWire 或 Microsoft 对本项目提供认证或背书。
# PDF rendering in version 1.1

PDF.js is referenced as the exact npm dependency `pdfjs-dist@6.4.299`, provided by Mozilla and contributors under Apache-2.0. Its package is installed by npm; workers, CMaps, fonts and WebAssembly assets are copied into ignored build output only. Source: https://github.com/mozilla/pdf.js. Project-authored airport diagrams and fixed weather examples are demonstration content created for A330EFB.
