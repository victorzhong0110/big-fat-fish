/* The chart is a small illustrated relief. Geometry follows the selected voyage. */
const TAU = Math.PI * 2;
const themes = {
  short: { islands:[[-.24,.08,.84,.9],[.42,-.27,.47,.64]], beacon:[-.22,.02], glow:'#ff9dbd' },
  expedition: { islands:[[-.76,-.08,.44,.56],[-.04,.16,.54,.89],[.71,-.14,.5,1.08]], beacon:[.69,-.12], glow:'#b4b4ff' },
  'tutorial-guide': { islands:[[-.12,.04,.85,.43],[.48,.16,.34,.24]], beacon:[.22,.04], glow:'#a5deff' },
  api: { islands:[[-.6,-.13,.61,1.15],[.39,.16,.61,1.36],[.09,-.47,.35,.9]], beacon:[.4,.15], glow:'#ff80ad' }
};
const decorations = {};
for(const [name,path] of Object.entries({
  fish:'characters/deepseek.png',beacon:'harbor/props/beacon.png',
  gate:'harbor/props/gate.png',radio:'harbor/props/console.png'
})){
  const image=new Image();image.src='./art/'+path;decorations[name]=image;
}
function prop(ctx,name,x,y,height) {
  const im=decorations[name];
  if(!im?.naturalWidth)return;
  const w=height*im.naturalWidth/im.naturalHeight;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(im,x-w/2,y-height,w,height);ctx.restore();
}
function setCanvas(canvas) {
  const box=canvas.getBoundingClientRect(), ratio=Math.min(2,devicePixelRatio||1);
  if(box.width<1||box.height<1)return;
  const w=Math.round(box.width*ratio),h=Math.round(box.height*ratio);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  const ctx=canvas.getContext('2d');ctx.setTransform(w/800,0,0,h/460,0,0);ctx.clearRect(0,0,800,460);
  return ctx;
}
function trace(ctx,points) {
  ctx.beginPath();
  points.forEach(([x,y],index)=>index ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
}
function ellipse(ctx,x,y,rx,ry,stroke) {
  ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.strokeStyle=stroke;ctx.stroke();
}
function shore(cx,cy,size,level,phase) {
  const points=[];
  for(let i=0;i<=100;i++){
    const a=TAU*i/100, rough=1+.13*Math.sin(3*a+phase)+.075*Math.cos(5*a-1.4)+.046*Math.sin(9*a+phase);
    const r=size*rough*(1-.72*level);
    points.push([cx+Math.cos(a)*r*197+Math.sin(a)*r*39+18*level,cy+Math.sin(a)*r*77+Math.cos(a)*r*10]);
  }
  return points;
}
function chart(ctx,mode,t) {
  const {islands,beacon,glow}=themes[mode]??themes['tutorial-guide'];
  const plane=ctx.createRadialGradient(390,255,4,390,255,300);plane.addColorStop(0,'#536ec944');plane.addColorStop(1,'#44509e00');
  ctx.fillStyle=plane;ctx.fillRect(0,0,800,460);
  ctx.lineWidth=1;
  for(let i=0;i<5;i++)ellipse(ctx,400,268,190+i*30,55+i*13,'#8cabe52d');
  for(let i=0;i<14;i++){const x=90+((i*147)%640),y=215+(i*31)%133;trace(ctx,[[x,y],[x+7,y-2],[x+19,y-1]]);ctx.strokeStyle='#94bcf03d';ctx.stroke();}
  // A dotted wake and a moving glint connect the soundings.
  ctx.save();ctx.setLineDash([4,7]);ctx.strokeStyle='#e7e2ff91';ctx.lineWidth=1.7;
  ctx.beginPath();ctx.moveTo(136,291);ctx.bezierCurveTo(291,426,479,174,649,270);ctx.stroke();ctx.restore();
  for(const [idx,[x,y,size,peak]] of [...islands].sort((a,b)=>a[1]-b[1]).entries()){
    const cx=400+x*275,cy=278+y*100;const bands=17;
    for(let k=0;k<=bands;k++){
      const l=k/bands,alt=(l**1.32)*112*peak;
      const pts=shore(cx,cy-alt,size,l,idx*2+.45);
      trace(ctx,pts);ctx.closePath();ctx.fillStyle=`hsl(${228+l*19} ${48+l*16}% ${25+l*45}%)`;ctx.fill();
      ctx.lineWidth=k===0?2.6:1.15;ctx.strokeStyle=k===0?'#b3caff':`rgba(207,219,255,${.22+l*.46})`;ctx.stroke();
    }
    const topY=cy-112*peak;
    prop(ctx,mode==='tutorial-guide'?'radio':mode==='api'?'gate':'beacon',cx+14,topY+4,mode==='api'?66:50);
  }
  const bx=400+beacon[0]*275+12,by=278+beacon[1]*100-Math.max(...islands.map(([x,y,size,p])=>Math.max(0,1-Math.hypot(beacon[0]-x,beacon[1]-y)/size)*p))*104;
  ctx.lineWidth=1.8;ctx.strokeStyle='#f1e9ff';trace(ctx,[[bx,by+3],[bx,by-45]]);ctx.stroke();
  const phase=(t/3)%1;ellipse(ctx,bx,by,6+phase*26,2+phase*8,`rgba(218,205,255,${1-phase})`);
  ctx.fillStyle=glow;ctx.shadowColor=glow;ctx.shadowBlur=12;ctx.beginPath();ctx.arc(bx,by-45,4,0,TAU);ctx.fill();ctx.shadowBlur=0;
  ctx.font='bold 14px system-ui';ctx.fillStyle='#f4eaff';ctx.fillText(mode==='expedition'?'末站':mode==='api'?'风眼':mode==='short'?'电台':'码头',bx+10,by-40);
}
function floorAt(x) {
  return 126+216*x+25*Math.sin(x*10-.7)+16*Math.sin(x*21+.4)+7*Math.sin(x*45);
}
function trench(ctx,level,t) {
  const at=i=>58+688*i, p=(level-1)/14, x=at(p), y=floorAt(p);
  const water=ctx.createLinearGradient(0,35,0,410);
  water.addColorStop(0,'#5b6aaa00');water.addColorStop(.45,'#475b9750');water.addColorStop(1,'#13172d2a');
  ctx.fillStyle=water;ctx.fillRect(58,35,688,390);
  for(let i=0;i<46;i++){
    const px=65+((i*197.4+Math.sin(t*.3+i)*4)%672),py=45+(i*71.9)%344;
    if(py>floorAt((px-58)/688)-7)continue;
    ctx.fillStyle=i%3?'#b9c9fa44':'#e5c7fd82';ctx.fillRect(px,py,i%3?1.6:2.5,1.5);
  }
  for(let k=0;k<5;k++){
    const points=[];
    for(let i=0;i<=145;i++){const u=i/145;points.push([at(u),floorAt(u)+k*15+Math.sin(k*.7+u*10)*k*3]);}
    trace(ctx,[...points,[746,443],[58,443]]);ctx.closePath();
    ctx.fillStyle=['#9c9de1','#7076c6','#505eb0','#36468b','#263363'][k];ctx.fill();
    trace(ctx,points);ctx.strokeStyle=k?'#bec7ff55':'#e9dfff';ctx.lineWidth=k?1:2;ctx.stroke();
  }
  for(let i=0;i<15;i++){
    const xx=at(i/14),yy=floorAt(i/14);ctx.fillStyle=i===level-1?'#ffb4d2':'#abbcec';
    ctx.beginPath();ctx.arc(xx,yy,i===level-1?5.5:2.5,0,TAU);ctx.fill();
  }
  const diverY=y-32;
  const lamp=ctx.createRadialGradient(x,diverY,1,x,diverY,76);
  lamp.addColorStop(0,'#ffe8ffb3');lamp.addColorStop(.37,'#e6c6ff45');lamp.addColorStop(1,'#d6d7ff00');
  ctx.fillStyle=lamp;ctx.fillRect(x-76,diverY-76,152,152);
  const dye=ctx.createLinearGradient(x,50,x,y);dye.addColorStop(0,'#e3b7ff08');dye.addColorStop(1,'#ffa7cf86');
  trace(ctx,[[x-12,47],[x+12,47],[x+3,y],[x-3,y]]);ctx.closePath();ctx.fillStyle=dye;ctx.fill();
  trace(ctx,[[x,45],[x,y]]);ctx.strokeStyle='#ffd0e8';ctx.lineWidth=1.4;ctx.stroke();
  const pulse=(t/2.5)%1;ellipse(ctx,x,y,6+pulse*22,3+pulse*9,`rgba(255,197,224,${1-pulse})`);
  ctx.beginPath();ctx.arc(x,diverY,18,0,TAU);ctx.fillStyle='#433d7388';ctx.fill();ctx.strokeStyle='#efd9ff';ctx.lineWidth=1.6;ctx.stroke();
  prop(ctx,'fish',x,diverY+13,28);
  for(let i=0;i<3;i++)ellipse(ctx,x+18+Math.sin(t+i)*3,diverY-14-(i*10+t*4)%31,2.6-i*.35,2.6-i*.35,'#d8dcff99');
  ctx.beginPath();ctx.arc(x,40,6,0,TAU);ctx.fillStyle='#ffb6d4';ctx.fill();
}
/** Keep hidden instruments idle and respect reduced-motion settings. */
export function mountInstruments() {
  const route=document.querySelector('#route-soundings'), depth=document.querySelector('#trench-section');
  const menu=document.querySelector('#departure-screen'), room=document.querySelector('#depth-room'), probe=document.querySelector('#depth-probe');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0, last=-Infinity;
  function active(){return !document.hidden && (room.open ? depth : route).getClientRects().length>0;}
  function paint(time){
    frame=0;if(!active())return;
    if(time-last>45||reduced.matches){
      const canvas=room.open?depth:route, ctx=setCanvas(canvas);
      if(ctx){const t=reduced.matches?0:time/1000;if(room.open)trench(ctx,Number(probe.value),t);else chart(ctx,menu.dataset.route,t);}
      last=time;
    }
    if(!reduced.matches)frame=requestAnimationFrame(paint);
  }
  function refresh(){last=-Infinity;if(!frame)frame=requestAnimationFrame(paint);}
  new ResizeObserver(refresh).observe(route);new ResizeObserver(refresh).observe(depth);
  let lastRoute='';
  new MutationObserver(()=>{
    if(menu.dataset.route!==lastRoute){
      lastRoute=menu.dataset.route;
      if(!reduced.matches && route.getClientRects().length)route.animate([{opacity:.3,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:300});
    }
    refresh();
  }).observe(menu,{attributes:true,attributeFilter:['data-route','class']});
  new MutationObserver(refresh).observe(room,{attributes:true,attributeFilter:['open']});
  probe.addEventListener('input',refresh);room.addEventListener('depthchange',refresh);
  reduced.addEventListener('change',refresh);document.addEventListener('visibilitychange',refresh);
}
