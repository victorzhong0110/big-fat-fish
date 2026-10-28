import {CHARACTER_NAMES,drawCharacter} from './v2/preview/characters.js';
/** Inspect the same rigs as combat, without advancing the world. */
export function mountCharacterGallery(){
 const root=document.querySelector('#character-gallery'),panel=document.querySelector('#characters-panel');if(!root||!panel)return;
 const labels={fish:'大肥鱼',deepseek:'DeepSeek',claude:'Claude',grok:'Grok Bot',codex:'Codex',dewey:'Dewey',fireball:'Fireball',hoots:'Hoots',rocky:'Rocky',seedy:'Seedy',stacky:'Stacky',bsod:'BSOD','null-signal':'Null Signal',rice:'饭团',patch:'补丁',cache:'小缓存',router:'路由员',rocket:'小火箭'};
 const controls=document.createElement('div');controls.className='model-controls';const label=document.createElement('label');label.textContent='查看动作 ';const select=document.createElement('select');select.id='model-pose';
 for(const [value,text] of [['idle','待机'],['move','移动'],['attack','攻击'],['control','受控'],['hurt','受击']]){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}label.append(select);controls.append(label);
 const turn=document.createElement('button');turn.type='button';turn.textContent='转向';turn.setAttribute('aria-pressed','false');let facing=0;turn.onclick=()=>{facing=facing?0:Math.PI;turn.setAttribute('aria-pressed',String(!!facing));};controls.append(turn);root.append(controls);
 const grid=document.createElement('div');grid.className='model-gallery';root.append(grid);const views=[];
 for(const name of CHARACTER_NAMES){const figure=document.createElement('figure'),canvas=document.createElement('canvas'),caption=document.createElement('figcaption');canvas.width=canvas.height=160;canvas.setAttribute('aria-label',`${labels[name]}像素模型`);canvas.dataset.model=name;caption.textContent=labels[name];figure.append(canvas,caption);grid.append(figure);views.push({name,canvas});}
 let request=0,start=0;
 function frame(now){if(!panel.open||document.hidden){request=0;return;}if(!start)start=now;const tick=Math.floor((now-start)*.06);for(const {canvas,name} of views){const ctx=canvas.getContext('2d');ctx.clearRect(0,0,160,160);ctx.imageSmoothingEnabled=false;drawCharacter(ctx,name,80,80,160,{tick,moving:select.value==='move',attacking:select.value==='attack'&&tick%30<15,controlled:select.value==='control',hurt:select.value==='hurt'&&tick%30<5,facing});}request=requestAnimationFrame(frame);}
 const resume=()=>{if(panel.open&&!document.hidden&&!request)request=requestAnimationFrame(frame);};panel.addEventListener('toggle',resume);document.addEventListener('visibilitychange',resume);resume();
}
