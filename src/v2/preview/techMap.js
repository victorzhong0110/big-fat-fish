// @ts-check
const routes = ['body','mcp','skill','explore','dsh'];
const labels = ['干饭','射击','技能','探索','DSH'];
const iconFrames = [0,7,8,10,2];
const eras = ['预训练','微调','对齐','全量涌现'];
const step = 242, lane = 122, width = 202, height = 94;

/** Draw the catalog DAG in route lanes. Every edge keeps its actual prerequisite IDs.
 * @calls 无内部公开函数。
 * @param {HTMLElement} root
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @param {import('../contracts.d.ts').Profile} profile
 * @param {(id:string)=>boolean} available
 * @param {(id:string)=>void} buy
 * @param {{filter:string,selected:string,left:number,top:number}} view
 * @returns {void}
 */
export function renderTechMap(root,catalog,profile,available,buy,view) {
  const filters=document.createElement('div'), viewport=document.createElement('div'), map=document.createElement('div');
  filters.className='tech-filters';viewport.className='tech-viewport';viewport.tabIndex=0;viewport.ariaLabel='横向科技树';map.className='tech-map';
  root.append(filters,viewport);viewport.append(map);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');map.append(svg);
  const points=new Map(), cards=new Map(), edges=/** @type {{parent:string,id:string,path:Element}[]} */([]);
  for(const [i,era] of eras.entries()){
    const header=document.createElement('h3');header.textContent=['I','II','III','IV'][i]+'　'+era;header.style.left=(16+[0,2,3,4][i]*step)+'px';map.append(header);
  }
  for(const n of Object.values(catalog.definitions).filter(n=>n.kind==='tree')){
    const [,route,suffix]=n.id.split('_'),r=routes.indexOf(route);
    const column=route==='dsh'?({a:2,b:3,c:4}[suffix]??4):({a:0,b:1,c:2,d:2,heavy:2,e:3,f:4}[suffix]??3);
    const row=r*3+(suffix==='d'?1:['heavy','context','extract'].includes(suffix)?2:0);
    const x=16+column*step,y=50+row*lane;
    points.set(n.id,{x,y,route,parents:Array.isArray(n.parameters.prerequisites)?n.parameters.prerequisites.map(String):[]});
    const card=document.createElement('article'),name=document.createElement('strong'),effect=document.createElement('small'),btn=document.createElement('button');
    const owned=profile.purchasedTree.includes(n.id),ready=available(n.id);
    card.className='tech-card';card.dataset.treeId=n.id;card.dataset.state=owned?'owned':ready?'ready':'locked';
    card.style.left=x+'px';card.style.top=y+'px';card.tabIndex=0;
    const icon=document.createElement('i');icon.className='tech-icon';icon.style.backgroundPositionX=(iconFrames[r]*10)+'%';name.append(icon,n.displayName);effect.textContent=String(n.parameters.effect);effect.title=effect.textContent;
    btn.textContent=owned?'已点亮':ready?'点亮':'锁定';btn.disabled=!ready||owned;btn.onclick=()=>buy(n.id);
    const price=document.createElement('span');price.textContent=n.parameters.cost+' 算力卡';card.append(name,effect,price,btn);map.append(card);cards.set(n.id,card);
    card.onpointerenter=()=>highlight(n.id);card.onpointerleave=()=>highlight(view.selected);
    card.addEventListener('focusin',()=>highlight(n.id));card.onclick=()=>{view.selected=n.id;highlight(n.id);};
  }
  for(const [id,p] of points)for(const parent of p.parents){
    const a=points.get(parent),x=a.x+width,y=a.y+height/2,end=p.x-2,endY=p.y+height/2;
    const mid=x+12+(p.y/ lane%3)*3;
    const path=document.createElementNS(svg.namespaceURI,'path');
    path.setAttribute('d',`M${x} ${y} H${mid} V${endY} H${end} m-6 -4 6 4 -6 4`);path.setAttribute('class',profile.purchasedTree.includes(id)&&profile.purchasedTree.includes(parent)?'tech-edge powered':'tech-edge');path.setAttribute('data-from',parent);path.setAttribute('data-to',id);svg.append(path);edges.push({parent,id,path});
  }
  /** @param {string} id */
  function highlight(id){
    const chain=new Set();
    /** @param {string} key */
    function visit(key){if(chain.has(key)||!points.has(key))return;chain.add(key);for(const parent of points.get(key).parents)visit(parent);}
    visit(id);
    for(const [key,card] of cards){card.classList.toggle('ancestor',chain.has(key));card.classList.toggle('muted',!!view.filter&&points.get(key).route!==view.filter&&!chain.has(key));}
    for(const edge of edges){const lit=chain.has(edge.id)&&chain.has(edge.parent);edge.path.classList.toggle('lit',lit);if(lit)svg.append(edge.path);}
  }
  for(const [i,route] of ['',...routes].entries()){
    const b=document.createElement('button');b.textContent=i?labels[i-1]:'全部路线';b.dataset.route=route;
    b.setAttribute('aria-pressed',String(route===view.filter));b.onclick=()=>{view.filter=route;view.selected='';for(const el of filters.querySelectorAll('button'))el.setAttribute('aria-pressed',String(el===b));if(route)viewport.scrollTop=points.get('tree_'+route+'_a').y-50;highlight('');};filters.append(b);
  }
  viewport.scrollLeft=view.left;viewport.scrollTop=view.top;
  viewport.onscroll=()=>{view.left=viewport.scrollLeft;view.top=viewport.scrollTop;};
  viewport.addEventListener('wheel',e=>{if(e.shiftKey||e.ctrlKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;const before=viewport.scrollLeft;viewport.scrollLeft+=e.deltaY;if(viewport.scrollLeft!==before)e.preventDefault();},{passive:false});
  let drag=/** @type {{x:number,y:number,left:number,top:number}|null} */(null);
  viewport.onpointerdown=e=>{if(e.pointerType!=='mouse'||e.button!==0||e.target instanceof Element&&e.target.closest('button'))return;drag={x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};};
  viewport.onpointermove=e=>{if(!drag||!(e.buttons&1)){drag=null;return;}if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>4){viewport.setPointerCapture(e.pointerId);viewport.scrollLeft=drag.left+drag.x-e.clientX;viewport.scrollTop=drag.top+drag.y-e.clientY;}};
  viewport.onpointerup=viewport.onpointercancel=()=>{drag=null;};highlight(view.selected);
}
