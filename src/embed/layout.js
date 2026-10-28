// Reserve the measured controls, including wrapped touch rows, before sizing play.
export function fitEmbedStage(root,stage,ratio) {
  function fit() {
    const style=getComputedStyle(root),number=value=>Number.parseFloat(value)||0;
    const visible=[...root.children].filter(child=>child!==stage&&!child.hidden&&getComputedStyle(child).display!=='none');
    const reserved=visible.reduce((sum,child)=>sum+child.getBoundingClientRect().height,0)+
      visible.length*number(style.rowGap)+number(style.paddingTop)+number(style.paddingBottom);
    const width=Math.max(1,Math.min(320,root.getBoundingClientRect().width-number(style.paddingLeft)-number(style.paddingRight),Math.max(1,innerHeight-reserved)*ratio));
    const value=`${width}px`;
    if(stage.style.width!==value)stage.style.width=value;
  }
  const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(fit);
  observer?.observe(root);
  window.addEventListener('resize',fit);
  fit();
  return ()=>{observer?.disconnect();window.removeEventListener('resize',fit)};
}
