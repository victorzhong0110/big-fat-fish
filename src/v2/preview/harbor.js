/** 港口海床和航标。全部装饰使用世界坐标；交互半径、开启状态和进度来自渲染快照。 */
const water = {
  inlet: ['#263e59', '#142d43', '#51697b', '#3e626d', '#254454'],
  claude: ['#344454', '#1b2a40', '#75636c', '#56656a', '#3b4d55'],
  gpt: ['#224c56', '#152d42', '#577b76', '#406d70', '#2d555c'],
  grok: ['#343e61', '#1e2949', '#6d6b91', '#536480', '#394c68'],
};
/** @type {HTMLImageElement|null} */
let seabed = null;
/** @type {Map<string, HTMLCanvasElement>} */
const beds = new Map();

/** Paint a low-contrast tile once per sea. The brightest ink is reserved for actors and signals.
 * @param {Document} doc @param {keyof typeof water} sea */
function bedTile(doc, sea) {
  const old = beds.get(sea);
  if (old) return old;
  const tile = doc.createElement('canvas');
  tile.width = 384;
  tile.height = 288;
  const ink = tile.getContext('2d');
  if (!ink) return null;
  const [, , ripple, leaf, base] = water[sea];
  let seed = 673;
  const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  // Sand ripples and tiny shell fragments follow the prevailing current.
  for (let i = 0; i < 80; i++) {
    const x = Math.floor(next() * tile.width), y = Math.floor(next() * tile.height);
    const length = 3 + Math.floor(next() * 13);
    ink.fillStyle = i % 3 ? ripple : '#0e233b';
    ink.globalAlpha = i % 3 ? .32 : .4;
    ink.fillRect(x, y, length, 1);
    ink.fillRect(x + length, y - 1, 3, 1);
    if (i % 4 === 0) ink.fillRect(x - 3, y + 3, 5, 1);
  }
  for (let i = 0; i < 9; i++) {
    const x = 12 + Math.floor(next() * 355), y = 17 + Math.floor(next() * 253);
    ink.globalAlpha = .68;
    for (let stem = 0; stem < 3; stem++) {
      let sx = x + stem * 3;
      const height = 3 + Math.floor(next() * 5);
      for (let j = 0; j < height; j++) {
        ink.fillStyle = j === height - 1 ? ripple : leaf;
        ink.fillRect(sx, y - j * 2, 2, 3);
        sx += j % 3 === 0 ? 1 : -1;
      }
    }
    ink.fillStyle = base;
    ink.fillRect(x - 4, y, 18, 2);
  }
  beds.set(sea, tile);
  return tile;
}

/** Paint visible water and the wooden mooring where the actual home checkpoint sits.
 * @calls 无内部公开函数。
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x:number,y:number,scale:number}} camera
 * @param {number} width
 * @param {number} height
 * @param {import('../contracts.d.ts').RenderSnapshot} view
 * @returns {void}
 */
export function drawHarborWater(ctx, camera, width, height, view) {
  const hud = /** @type {{map:{biomeIndex?:number,width:number,height:number},expeditionRoute?:('gpt'|'grok'|'claude')[],waterFaction?:'gpt'|'grok'|'claude'}} */(view.hud);
  const sea = hud.expeditionRoute?.[hud.map.biomeIndex ?? 0] ?? hud.waterFaction ?? 'inlet';
  const [light, dark] = water[sea];
  const w = width / camera.scale, h = height / camera.scale;
  const gradient = ctx.createLinearGradient(camera.x, camera.y, camera.x + w * .6, camera.y + h);
  gradient.addColorStop(0, light); gradient.addColorStop(1, dark);
  ctx.fillStyle = gradient;
  ctx.fillRect(camera.x, camera.y, w, h);
  if (!seabed && typeof Image !== 'undefined') {
    seabed = new Image(); seabed.src = './art/harbor/seabed.webp';
  }
  if (seabed?.complete && seabed.naturalWidth) {
    ctx.save(); ctx.globalAlpha = .74;
    ctx.drawImage(seabed,0,0,hud.map.width,hud.map.height);
    ctx.restore();
  } else {
    const tile = ctx.canvas.ownerDocument && bedTile(ctx.canvas.ownerDocument, sea);
    if (tile) {
      const tw = tile.width * 2, th = tile.height * 2;
      for (let y = Math.floor(camera.y / th) * th; y < camera.y + h; y += th) {
        for (let x = Math.floor(camera.x / tw) * tw; x < camera.x + w; x += tw) ctx.drawImage(tile, x, y, tw, th);
      }
    }
  }
  const berth = view.entities.find(e => e.id.endsWith('checkpoint:home'));
  if (!berth || camera.x > berth.position.x + 75 || camera.y > berth.position.y + 75) return;
  const {x, y} = berth.position;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#152437'; ctx.fillRect(-x, -29, x + 49, 82);
  ctx.fillStyle = '#4b4b50'; ctx.fillRect(-x, -36, x + 47, 76);
  for (let plank = 42; plank > -x; plank -= 15) {
    ctx.fillStyle = plank % 2 ? '#62605b' : '#70675c';
    ctx.fillRect(plank - 11, -36, 13, 70);
    ctx.fillStyle = '#494a50'; ctx.fillRect(plank - 5, -19, 2, 24);
    ctx.fillStyle = '#9a8871'; ctx.fillRect(plank - 8, -31, 3, 2);
  }
  for (const px of [-105, 35]) for (const py of [-35, 36]) {
    ctx.fillStyle = '#2c3342'; ctx.fillRect(px - 4, py - 5, 9, 15);
    ctx.fillStyle = '#b1a38b'; ctx.fillRect(px - 4, py - 7, 9, 4);
  }
  ctx.restore();
}

/** @type {Map<string,HTMLImageElement>} */
const props=new Map();

/** Paint each prop from trimmed transparent artwork, keeping the readable state on top.
 * @calls 无内部公开函数。
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../contracts.d.ts').RenderEntity} entity
 * @returns {void}
 */
export function drawHarborLandmark(ctx,entity){
  const kind=entity.spriteId, {x,y}=entity.position;
  const art=propStyles[kind];
  if(!art)return;
  const name=(kind==='world_cache'||kind==='world_alarm')&&entity.opened?'cache-open':art.name;
  let sprite=props.get(name);
  if(!sprite&&typeof Image!=='undefined'){sprite=new Image();sprite.src='./art/harbor/props/'+name+'.png';props.set(name,sprite);}
  const size=art.size||entity.radius*2.1, dx=kind==='world_checkpoint'?-32:0;
  if(sprite?.complete&&sprite.naturalWidth){
    const ratio=size/Math.max(sprite.naturalWidth,sprite.naturalHeight);
    const w=sprite.naturalWidth*ratio,h=sprite.naturalHeight*ratio;
    ctx.drawImage(sprite,Math.round(x+dx-w/2),Math.round(y-h*.62),w,h);
  }else{
    ctx.fillStyle='#ceb58a';ctx.fillRect(x+dx-4,y-5,8,10);
  }
  if(kind==='world_gate'&&!entity.unlocked){
    ctx.strokeStyle='#d0a573';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-25,y);ctx.lineTo(x+25,y+3);ctx.stroke();
  }
  if(kind==='world_beacon'&&entity.opened){
    ctx.fillStyle='#ffe5a3';ctx.fillRect(x-3,y-size*.52,6,5);
  }
}

const propStyles=/** @type {Record<string,{name:string,size:number}>} */({
  world_cache:{name:'cache',size:44}, world_alarm:{name:'cache',size:48},
  world_beacon:{name:'beacon',size:74}, world_checkpoint:{name:'checkpoint',size:50}, world_gate:{name:'gate',size:96},
  terrain_rock:{name:'reef',size:0}, terrain_breakable:{name:'reef',size:0}, terrain_clutter:{name:'gear',size:44},
  easter_chair:{name:'chair',size:48},easter_note:{name:'note',size:35},easter_lunchbox:{name:'lunchbox',size:42},
  easter_console:{name:'console',size:48},easter_interface:{name:'cartridge',size:38},
  world_blockade_core:{name:'console',size:0},world_blockade_relay:{name:'beacon',size:0},
  world_challenge:{name:'console',size:48}, world_signal:{name:'beacon',size:45},
  part:{name:'gear',size:19},gpuFragment:{name:'cartridge',size:18},weapon:{name:'cartridge',size:32},skill:{name:'console',size:30}
});
