import React from 'react';
import ReactDOM from 'react-dom';
export function render(component: React.ReactElement){window.addEventListener('AceInitialized',()=>ReactDOM.render(component,document.getElementById('MSFS_REACT_MOUNT')));}
export const debouncedTimeDelta=(a:number,b:number)=>Math.max(0,a-b)<60?Math.max(0,a-b):0;
