// @ts-check
import { parseModPackage, composeModCatalog } from '../content/mods.js';
/** Local community mod manager. Installation is persistent; activation applies only at next departure. */

/** Mount import/enable/remove UI and provide a detached, validated practice catalog.
 * @calls content/mods.js#composeModCatalog
 * @calls content/mods.js#parseModPackage
 * @param {HTMLElement} root
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} base
 * @param {(message:string) => void} notify
 * @returns {{getCatalog: () => import('../contracts.d.ts').ContentCatalog; dispose: () => void}}
 */
export function mountModManager(root, base, notify) {
  const storageKey = 'big-fat-fish:v2:mods:1';
  let installed = /** @type {{pack:import('../contracts.d.ts').ModPackage; enabled:boolean}[]} */([]), loading = false, disposed = false;
  const listeners = /** @type {(() => void)[]} */([]);
  const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json'; input.hidden = true;
  const button = document.createElement('button'); button.type = 'button'; button.textContent = '安装本地模组 (.json)';
  const list = document.createElement('div'); list.className = 'mod-list'; list.setAttribute('aria-live', 'polite');
  const status = document.createElement('p'); status.className = 'scope-note';
  root.append(button, input, list, status);
  /** @param {EventTarget} target @param {string} event @param {EventListener} listener */
  function on(target, event, listener) { target.addEventListener(event, listener); listeners.push(() => target.removeEventListener(event, listener)); }
  /** @param {typeof installed} candidate */
  function persist(candidate) {
    if (candidate.length > 32) throw new Error('最多安装32个模组');
    composeModCatalog(base, candidate.filter(item => item.enabled).map(item => item.pack));
    const text = JSON.stringify(candidate);
    if (new TextEncoder().encode(text).length > 2097152) throw new Error('已安装模组总量超过2 MiB');
    localStorage.setItem(storageKey, text); installed = structuredClone(candidate); render();
  }
  function render() {
    if (disposed) return;
    list.replaceChildren();
    for (const item of installed) {
      const card = document.createElement('article'); card.className = 'mod-card';
      const name = document.createElement('strong'); name.textContent = `${item.pack.name} · ${item.pack.version}`;
      const description = document.createElement('p'); description.textContent = `${item.pack.author} / ${item.pack.id} — ${item.pack.description}`;
      const toggle = document.createElement('button'); toggle.type = 'button'; toggle.textContent = item.enabled ? '停用' : '启用'; toggle.setAttribute('aria-pressed', String(item.enabled));
      toggle.onclick = () => { try { persist(installed.map(entry => entry.pack.id === item.pack.id ? { ...entry, enabled: !entry.enabled } : entry)); } catch (error) { notify(String(error)); } };
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '移除'; remove.onclick = () => { try { persist(installed.filter(entry => entry.pack.id !== item.pack.id)); } catch (error) { notify(String(error)); } };
      card.append(name, description, toggle, remove); list.append(card);
    }
    root.dispatchEvent(new Event('modschange'));
    status.textContent = installed.length ? `已安装 ${installed.length} 个 · 已启用 ${installed.filter(item => item.enabled).length} 个。仅影响下次 Free 出发；原版和每组模组使用独立检查点。` : '暂无模组。SDK 1.0/1.1支持MCP参数、名称和新武器配方。仅在Free练习生效。';
  }
  function read() {
    try {
      const raw = localStorage.getItem(storageKey); if (!raw) { installed = []; render(); return; }
      if (new TextEncoder().encode(raw).length > 2097152) throw new Error('模组库超过大小限制');
      const data = JSON.parse(raw);
      if (!Array.isArray(data) || data.length > 32) throw new Error('模组库格式错误');
      const next = data.map(item => {
        if (!item || typeof item.enabled !== 'boolean' || Object.keys(item).some(key => !['pack', 'enabled'].includes(key))) throw new Error('模组库条目错误');
        return { pack: parseModPackage(JSON.stringify(item.pack), base), enabled: item.enabled };
      });
      if (new Set(next.map(item => item.pack.id)).size !== next.length) throw new Error('重复安装的模组ID');
      composeModCatalog(base, next.filter(item => item.enabled).map(item => item.pack)); installed = next; render();
    } catch (error) {
      installed = []; render(); status.textContent = `模组未加载，原数据已保留：${String(error)}。可移除或修正本地模组后重新导入。`;
    }
  }
  on(button, 'click', () => input.click());
  on(input, 'change', () => { void (async () => {
    if (loading) return;
    const file = input.files?.[0]; if (!file) return;
    loading = true; button.disabled = true;
    try {
      if (file.size > 262144) throw new Error('模组超过256 KiB');
      const pack = parseModPackage(await file.text(), base);
      if (disposed) return;
      if (installed.some(item => item.pack.id === pack.id)) throw new Error('此模组ID已安装，请先移除旧版');
      persist([...installed, { pack, enabled: false }]); notify(`已安装 ${pack.name}，点击启用后下次Free出发生效。`);
    } catch (error) { if (!disposed) notify(`安装失败：${String(error)}`); }
    finally { loading = false; if (!disposed) { input.value = ''; button.disabled = false; } }
  })(); });
  on(window, 'storage', event => { if (/** @type {StorageEvent} */(event).key === storageKey) read(); });
  read();
  return { getCatalog() { return composeModCatalog(base, installed.filter(item => item.enabled).map(item => item.pack)); }, dispose() { disposed = true; for (const remove of listeners) remove(); root.replaceChildren(); } };
}
