/** Open the same settings desk from the title or a paused voyage. */
export function mountSettings() {
  const dialog = document.querySelector('#settings-panel');
  const tabs = [...dialog.querySelectorAll('[data-tab-setting]')];
  const audio = dialog.querySelector('#audio-settings');
  const controls = dialog.querySelector('#control-settings');
  function select(name) {
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
