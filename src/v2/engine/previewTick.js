// @ts-check
import {advanceWorldTick,advanceUiTick} from './tick.js';
/** Compatibility entry for the original vertical-slice callers; all execution uses the canonical engine pipeline.
 * @implementationScope core-preview + adventure-slice
 * @calls engine/tick.js#advanceWorldTick
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @param {readonly import('../contracts.d.ts').Command[]} commands
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').TickResult}
 */
export function advancePreviewWorldTick(state,commands,catalog){return advanceWorldTick(state,commands,catalog);}
/** Compatibility UI entry; false flushes commands without advancing the LoRA pointer.
 * @implementationScope core-preview + adventure-slice
 * @calls engine/tick.js#advanceUiTick
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @param {readonly import('../contracts.d.ts').Command[]} commands
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @param {boolean} advanceClock
 * @returns {import('../contracts.d.ts').TickResult}
 */
export function advancePreviewUiCommands(state,commands,catalog,advanceClock=false){return advanceUiTick(state,commands,catalog,advanceClock);}
