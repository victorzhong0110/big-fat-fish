// Follow the same harbor navigation as a player, including the separate workshop.
async function setHarborTools(page, open) {
  const home = page.locator('#home-drawer');
  if (await home.isVisible() && await home.evaluate(element => element.open) !== open) {
    await home.locator(':scope > summary').click();
  }
}

export async function ensureDeparture(page) {
  const start = page.locator('#open-departure');
  if (await start.isVisible()) {
    await setHarborTools(page, false);
    await start.click();
  }
}

export async function ensureAdvanced(page) {
  await ensureDeparture(page);
  const advanced = page.locator('#advanced-settings');
  if (!await advanced.evaluate(element => element.open)) await advanced.locator(':scope > summary').click();
}

export async function selectMode(page, value) {
  await ensureAdvanced(page);
  await page.locator('#mode-select').selectOption(value);
}

export async function setDrawer(page, id, open) {
  if (id === 'settings-panel') {
    const dialog = page.locator('#settings-panel');
    if (await dialog.evaluate(element => element.open) !== open) {
      await page.locator(open ? '[data-open-settings]:visible' : '#close-settings').click();
    }
    return;
  }
  if (id === 'mods-panel') {
    const workshop = page.locator('#workshop');
    if (await workshop.evaluate(element => element.open) === open) return;
    if (open) {
      if (await page.locator('#back-home').isVisible()) await page.locator('#back-home').click();
      await setHarborTools(page, true);
      await page.locator('#open-workshop').click();
    } else {
      await page.locator('#workshop form button').click();
      await ensureDeparture(page);
    }
    return;
  }
  const drawer = page.locator(`#${id}`);
  if (await drawer.evaluate(element => !!element.closest('#home-drawer'))) {
    if (await page.locator('#back-home').isVisible()) await page.locator('#back-home').click();
    await setHarborTools(page, true);
  }
  if (await drawer.evaluate(element => element.open) !== open) await drawer.locator(':scope > summary').click();
}
