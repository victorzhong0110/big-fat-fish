import {describe,it,expect} from 'vitest';
import {CHARACTER_NAMES,characterSource,resolveCharacterModel} from '../../src/v2/preview/characters.js';

describe('stage-2 character sheets',()=>{
 it('keeps the locked base sheets and adds ChatGPT plus state art without reusing the Claude SVG crop',()=>{
  expect(CHARACTER_NAMES).toContain('chatgpt');
  expect(characterSource('claude')).toBe('./art/characters/claude.svg');
  expect(characterSource('claude-attack')).toBe('./art/characters/claude-attack.png');
  expect(characterSource('claude-hurt')).toBe('./art/characters/claude-hurt.png');
  expect(characterSource('deepseek')).toBe('./art/characters/deepseek.png');
  expect(characterSource('deepseek-hurt')).toBe('./art/characters/deepseek-hurt.png');
  expect(characterSource('chatgpt')).toBe('./art/characters/chatgpt.png');
  expect(characterSource('chatgpt-attack')).toBe('./art/characters/chatgpt-attack.png');
  expect(characterSource('grok-hurt')).toBe('./art/characters/grok-hurt.png');
  expect(resolveCharacterModel('boss_gpt')).toBe('chatgpt');
  expect(resolveCharacterModel('player_fish')).toBe('deepseek');
  expect(resolveCharacterModel('boss_claude')).toBe('claude');
 });
});
