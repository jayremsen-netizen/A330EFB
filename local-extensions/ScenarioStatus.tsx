import React from 'react';
import {useHistory} from 'react-router-dom';
import {useLocal} from './state';
import {scenarioClock} from '../local-efb/scenario-clock';
export function ScenarioStatus(){
 const s=useLocal(),h=useHistory(),clock=scenarioClock(s.flight.date);
 return <span style={{fontSize:12,marginLeft:12}} data-testid="scenario-clock-label" title="日期采用当前航班，样例时间固定0800Z；不是实时观测时间">场景时间{clock.fallback?'（后备样例）':''}{s.groundReset&&<button data-testid="ground-reset-entry" style={{marginLeft:12,color:'#ffc67a',border:'1px solid #a87837',padding:'3px 7px',borderRadius:4}} title="刷新已重建停机场景：5000 kg燃油、0人、0货物，GPU断开；旧请求与故障清除。点击恢复准备状态。" onClick={e=>{e.stopPropagation();h.push('/presets');}}>地面已复位 · 恢复准备</button>}</span>;
}
