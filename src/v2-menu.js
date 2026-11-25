/** Open the same settings desk from the title or a paused voyage. */
export function mountSettings() {
  const dialog = document.querySelector('#settings-panel');
  const tabs = [...dialog.querySelectorAll('[data-tab-setting]')];
  const audio = dialog.querySelector('#audio-settings');
  const controls = dialog.querySelector('#control-settings');
  function select(name) {
    dialog.dataset.page=name;
    audio.hidden = name !== 'audio';
    controls.hidden = name !== 'controls';
    for (const tab of tabs) tab.setAttribute('aria-pressed', String(tab.dataset.tabSetting === name));
  }
  for (const button of document.querySelectorAll('[data-open-settings]')) {
    button.addEventListener('click', () => {
      select('audio');
      dialog.showModal();
    });
  }
  for (const tab of tabs) tab.addEventListener('click', () => select(tab.dataset.tabSetting));
}

/** Keep the hero and foam on separate planes as the pointer crosses the wave. */
export function mountTitleMotion(){
  const menu=document.querySelector('#menu'),hero=document.querySelector('#home-screen');
  const fine=matchMedia('(pointer:fine) and (prefers-reduced-motion:no-preference)');
  function reset(){menu.style.removeProperty('--drift-x');menu.style.removeProperty('--drift-y');}
  menu.addEventListener('pointermove',event=>{
    if(!fine.matches||hero.classList.contains('hidden'))return;
    const r=menu.getBoundingClientRect();
    menu.style.setProperty('--drift-x',((event.clientX-r.left)/r.width*2-1)*9+'px');
    menu.style.setProperty('--drift-y',((event.clientY-r.top)/r.height*2-1)*5+'px');
  });
  menu.addEventListener('pointerleave',reset);fine.addEventListener('change',reset);
}
