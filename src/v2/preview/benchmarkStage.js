// @ts-check
/** Animated previews of the Benchmark ladder, drawn on a shared isometric reef. */
import { characterSource } from './characters.js';

// Feet are positioned in percentages of the reef artwork; props are frames in reef-atlas.png.
/** @typedef {[string,number,number,string?,number?]} Piece */
/** @type {Record<string, Piece[]>} */
const scenes = {
  '0': [['deepseek',40,54,'aim'],['prop-7',67,53,'target',16]],
  '1': [['deepseek',39,61,'aim'],['claude',60,44,'advance'],['grok',77,51,'arrive']],
  '2': [['deepseek',28,56,'aim'],['grok',55,43,'arrive'],['grok',69,45,'wave-two'],['grok',80,57,'wave-three']],
  '3': [['hoots',62,47,'pulse'],['dewey',77,48,'support'],['rocky',43,62,'guard']],
  '4': [['deepseek',26,60,'duck'],['prop-1',50,53,'breakable',20],['claude-attack',68,55,'hammer',36],['chips',50,46,'splinters',20]],
  '5': [['deepseek',33,61,'duck'],['warning',52,55,'combo',27],['claude-attack',68,53,'double-hit',34]],
  '6': [['deepseek',37,58,'aim'],['prop-3',57,49,'alarm',18],['grok',74,43,'wave-two']],
  '7': [['current',48,54,'tide',44],['deepseek',41,53,'drift'],['grok',65,50,'drift']],
  '8': [['grok',26,47,'flank-left'],['grok',33,67,'flank-left',19],['deepseek',54,56,'duck'],['grok',80,45,'flank-right'],['grok',74,62,'flank-right',19]],
  '9': [['deepseek',31,60,'aim'],['rocky',52,52,'guard'],['dewey',69,48,'retreat']],
  '10': [['prop-1',36,51,'breakable',17],['warning',46,58,'combo',25],['claude-attack',64,55,'hammer',35]],
  '11': [['prop-4',53,44,'alarm',17],['grok',35,45,'wave-two'],['claude-attack',73,58,'double-hit',29]],
  '12': [['rocky',37,61,'guard',21],['hoots',47,44,'pulse',21],['dewey',62,42,'support',21],['fireball',73,60,'advance',21]],
  '13': [['claude-hurt',37,58,'retreat'],['deepseek',51,62,'aim'],['grok',75,44,'wave-two']],
  '14': [['current',44,58,'tide',38],['prop-2',59,52,'block',18],['deepseek',39,48,'drift']],
  '15': [['rocky',32,57,'guard'],['claude-attack',54,44,'hammer'],['grok',72,57,'wave-three']],
  api: [['chatgpt',33,49,'arrive'],['claude-attack',53,58,'wave-two'],['grok',73,49,'wave-three']]
};

/** Play the selected mechanic once after the wheel settles.
 * @calls preview/characters.js#characterSource
 * @param {HTMLElement} root
 * @param {string} value
 * @param {boolean} locked
 * @returns {void}
 */
export function renderBenchmarkCast(root,value,locked) {
  const key=value+(locked?'-locked':'');
  if(root.dataset.scene===key)return;
  root.dataset.scene=key;
  const cast=scenes[value]??scenes['1'];
  const silhouette=cast.find(([id])=>!id.startsWith('prop-')&&!['deepseek','current','warning','chips'].includes(id));
  const pieces=locked ? [/** @type {Piece} */([silhouette?.[0]??'grok',53,55,'mystery',35])] : cast;
  root.replaceChildren();
  for(const [id,x,y,motion,size=26] of pieces){
    const slot=document.createElement('span');
    slot.className='stage-piece';slot.style.left=x+'%';slot.style.top=y+'%';slot.style.width=size+'%';
    const prop=id.startsWith('prop-'),effect=['chips','current','warning'].includes(id);
    const art=prop||effect?document.createElement('i'):document.createElement('img');
    art.className='stage-motion motion-'+motion;
    if(art instanceof HTMLImageElement){art.src=characterSource(id)??'';art.alt='';}
    else if(prop){art.classList.add('stage-prop');art.style.backgroundPositionX=(Number(id.slice(5))*100/11)+'%';}
    else art.classList.add('stage-'+id);
    slot.append(art);root.append(slot);
  }
}
