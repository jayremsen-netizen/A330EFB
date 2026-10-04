import React from 'react';
import {Link,useLocation} from 'react-router-dom';
import {usePersistentNumberProperty,usePersistentProperty,usePersistentSetting} from '@flybywiresim/fbw-sdk';
import './local.css';

const features=[
 ['/dispatch/local-flight','航班与载荷','手工计划、JSON 导入导出、重量确认'],
 ['/performance/engineering-takeoff','起飞性能','工程 TOGA / FLEX、速度、距离、限重及报告'],
 ['/performance/landing','着陆参考','190000 kg 基准重量下的距离参考'],
 ['/navigation/local-files','离线资料','本机 PDF、图片、分页与内置示意图'],
 ['/dispatch/local-weather','天气资料','固定样例采用与手工天气输入'],
 ['/ground/services','地面流程','本地加油、登机、电源、推出及命令回执'],
 ['/checklists','检查单','逐项人工确认与复位'],
 ['/presets','场景与故障','本地预设和设备故障演示'],
];

export function LocalCapabilityLink(){return <div className="lf-groundbar"><b>A330EFB 本地演示</b><span>航班、性能、资料与地面流程已接入本地模型。</span><Link to="/settings">功能范围与设置 →</Link></div>;}

export function UnavailableCapability({kind='external'}:{kind?:'external'|'charts'|'atc'}){
 const title=kind==='charts'?'外部航图未接入':kind==='atc'?'在线空管未接入':'外部服务未接入';
 return <div className="lf-root" data-testid="unavailable-capability"><div className="lf-heading"><div><h2>{title}</h2><p>当前版本运行于浏览器本地演示环境</p></div><span className="lf-chip">未接入</span></div>
 <section><h3>本版本的连接范围</h3><p>Navigraph 账户与在线航图、SimBrief 在线签派、GSX 地服、MSFS 飞机会话、SimBridge、VATSIM / IVAO / ATIS 均未接入。此处不提供登录、连接或同步开关。</p><p>本地燃油与登机由 A330EFB 演示模型处理，浏览器中曾保存的外部同步设置不会接管这些操作。</p><div className="lf-toolbar"><Link to="/navigation/local-files">打开本机资料</Link><Link to="/dispatch/local-flight">编辑本地航班</Link><Link to="/ground/services">打开地面服务</Link><Link to="/settings">查看全部可用功能</Link></div></section></div>;
}

export function LocalSettingsPage(){
 const location=useLocation();
 const [theme,setTheme]=usePersistentSetting('EFB_UI_THEME');
 const [language,setLanguage]=usePersistentProperty('EFB_LANGUAGE','zh-CN');
 const [keyboard,setKeyboard]=usePersistentNumberProperty('EFB_AUTO_OSK',0);
 if(!['/settings','/settings/flypad','/settings/about'].includes(location.pathname))return <UnavailableCapability/>;
 const changeTheme=(value:'orange'|'blue'|'dark'|'light')=>{setTheme(value);for(const c of [...document.documentElement.classList])if(c.startsWith('theme-'))document.documentElement.classList.remove(c);document.documentElement.classList.add('theme-'+value);};
 return <div className="lf-root" data-testid="local-capabilities"><div className="lf-heading"><div><h2>本地演示功能与设置</h2><p>可用功能直接进入工作页面；外部连接统一显示接入状态</p></div><span className="lf-chip">A330EFB</span></div>
 <div className="lf-cols">{features.map(([url,name,description])=><section key={url}><h3><Link to={url}>{name} →</Link></h3><p>{description}</p></section>)}</div>
 <section style={{marginTop:16}}><h3>界面偏好</h3><div className="lf-toolbar"><label>主题 <select aria-label="本地界面主题" value={theme} onChange={e=>changeTheme(e.target.value as any)}><option value="orange">橙色</option><option value="blue">蓝色</option><option value="dark">深色</option><option value="light">浅色</option></select></label><label>原生界面语言 <select aria-label="原生界面语言" value={language} onChange={e=>setLanguage(e.target.value)}><option value="zh-CN">简体中文</option><option value="en">English</option></select></label><label><input aria-label="自动显示屏幕键盘" type="checkbox" checked={!!keyboard} onChange={e=>setKeyboard(e.target.checked?1:0)}/> 自动显示屏幕键盘</label></div><p>本地扩展说明使用中文。质量、长度和压力单位在对应输入页面选择。</p></section>
 <section style={{marginTop:16}}><h3>外部服务</h3><p>Navigraph、SimBrief、GSX、MSFS、SimBridge 与在线 ATC：未接入。</p><Link to="/settings/external-services">查看接入范围说明 →</Link></section>
 <section style={{marginTop:16}}><h3>项目与开源来源</h3><p>A330EFB 基于固定版本的 Headwind EFB 与 FlyByWire 公共系统构建。保留上游署名和 GPL-3.0 许可；工程性能、本地流程与演示控制由 A330EFB 扩展实现。</p><div className="lf-toolbar"><a href="https://github.com/jayremsen-netizen/A330EFB" target="_blank" rel="noreferrer">A330EFB 项目与许可证</a><a href="https://github.com/headwindsim/aircraft/tree/41eace79ed442696a6361dc72947954c9a6cf5cb" target="_blank" rel="noreferrer">Headwind 固定版本</a><a href="https://github.com/flybywiresim/aircraft/tree/1bf4b8edccf84d0fb83d0eb15e42f2c773e09582" target="_blank" rel="noreferrer">FlyByWire 固定版本</a></div></section>
 </div>;
}
