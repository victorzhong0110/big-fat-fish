// Scenario tests use the same home, departure and drawer navigation as players.
export async function ensureDeparture(page) {
  const start = page.locator('#open-departure');
  if (await start.isVisible()) await start.click();
}
export async function ensureAdvanced(page) {
  await ensureDeparture(page);
  const advanced = page.locator('#advanced-settings');
  if (!await advanced.evaluate(element => element.open)) await advanced.locator('summary').click();
}
export async function selectMode(page, value) {
  await ensureAdvanced(page);
  await page.locator('#mode-select').selectOption(value);
}
export async function setDrawer(page, id, open) {
  const back=page.locator('#back-home');
  if (open&&await back.isVisible()) await back.click();
  const drawer=page.locator(`#${id}`);
  if ((await drawer.evaluate(element=>element.open))!==open) await drawer.locator('summary').click();
}
