const layers = [
  ['近港巡游','接通沿途电台。驻守的敌人会拦路，追兵也会赶来。'],
  ['援军入场','小心第二批。驻守敌人分批入场，间隔四秒。'],
  ['后排支援','治疗者优先照顾后排，前排会挡住你的射线。'],
  ['重钳破阵','蟹钳能砸碎掩体。躲到箱子后，也要留好退路。'],
  ['首领连招','首领会接连出两招。躲过第一下，留心下一次预警。'],
  ['警报箱','打开警报箱可以挑一把强化武器，也会招来援军。'],
  ['潮流翻转','水道每三十秒换向。看箭头，敌我都会被水推走。'],
  ['两翼合围','Grok 的队伍从两侧先后入场，中间留有突破口。'],
  ['换位掩护','远程敌人会后撤，Rocky 会横到你和队友之间。'],
  ['首领借势','掩体、重置节点和增援入口都会影响首领战的走位。'],
  ['增援电台','目标附近会架起援军电台。击毁它可断援；Claude 的禁锢与封禁也会延长。'],
  ['四职混编','前排、治疗、远射与干扰可能在同一场遭遇里碰头。'],
  ['追兵接力','精英队濒临溃散时，下一批追兵可能提前发来预警。'],
  ['乱流封路','局部潮流可能反向，捷径也可能暂时关闭。留意预警，改走旁路。'],
  ['三段围攻','一场遭遇分三段。每段组合两种机制，清场后有短暂喘息。']
];
/** Preview locked layers freely. Only the formal game's unlocked options can be applied. */
export function mountDepthSelector() {
  const by=id=>document.getElementById(id);
  const native=by('difficulty-select'), open=by('open-depth'), dialog=by('depth-room'), probe=by('depth-probe'), apply=by('apply-depth');
  const allowed=n=>Array.from(native.options).some(o=>o.value===String(n)&&!o.disabled);
  function sync(){
    const v=native.value;
    open.disabled=native.disabled||!v||v==='api';
    by('current-depth').textContent=v==='api'?'持续生存':native.disabled?'教学':String(v||1).padStart(2,'0')+' 层';
    if(dialog.open)render();
  }
  function render(){
    const n=Number(probe.value),[title,description]=layers[n-1];
    by('layer-number').textContent=String(n).padStart(2,'0');
    by('layer-name').textContent=title;by('layer-change').textContent=description;
    by('layer-lock').textContent=allowed(n)?n===1?'初次出海即可进入。':'包含前面各层的敌情。':`通关第 ${n-1} 层后开放。`;
    by('depth-up').disabled=n===1;by('depth-down').disabled=n===15;
    apply.disabled=native.disabled||!allowed(n);apply.textContent=apply.disabled?'尚未解锁':'使用此难度';
    probe.setAttribute('aria-valuetext',`第 ${n} 层，${title}`);
    dialog.dispatchEvent(new Event('depthchange'));
  }
  open.addEventListener('click',()=>{probe.value=native.value;render();dialog.showModal();probe.focus();});
  probe.addEventListener('input',render);
  const section=by('trench-section');
  function soundAt(event) {
    const box=section.getBoundingClientRect();
    const fraction=((event.clientX-box.left)/box.width-.0725)/.86;
    probe.value=String(1+Math.round(Math.max(0,Math.min(1,fraction))*14));
    render();
  }
  section.addEventListener('pointerdown',event=>{
    if(!event.isPrimary||event.button!==0)return;
    section.setPointerCapture(event.pointerId);soundAt(event);
  });
  section.addEventListener('pointermove',event=>{
    if(section.hasPointerCapture(event.pointerId))soundAt(event);
  });
  for(const [id,step] of [['depth-up',-1],['depth-down',1]])by(id).addEventListener('click',()=>{probe.value=String(Number(probe.value)+step);render();});
  apply.addEventListener('click',()=>{
    if(native.disabled||!allowed(probe.value))return;
    native.value=probe.value;native.dispatchEvent(new Event('change',{bubbles:true}));dialog.close();
  });
  native.addEventListener('change',sync);
  new MutationObserver(sync).observe(native,{childList:true,attributes:true,attributeFilter:['disabled']});
  sync();
}
