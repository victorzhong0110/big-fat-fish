import {describe,it,expect} from 'vitest';
import {state} from './fixtures.js';
import {stationName,routeBrief,voyageLog} from '../../src/v2/preview/radio.js';
describe('voyage broadcasts',()=>{
  it('uses the selected faction and only replies from stations the player reached',()=>{
    const s=state();s.start.bossFaction='gpt';
    s.world.objectives=[{id:'beacon:2',kind:'beacon',progress:700,completed:false}];
    expect(voyageLog(s).at(-1).speaker).toBe(stationName('b1:beacon:2')+' · 调频中');
    expect(voyageLog(s).some(l=>l.speaker.includes('修船工'))).toBe(false);
    s.world.objectives[0].completed=true;
    const reply=voyageLog(JSON.parse(JSON.stringify(s))).at(-1);
    expect(reply.speaker).toContain('观测员');
    s.flow.phase='victory';expect(voyageLog(s).at(-1).text).toContain('ChatGPT');
  });
  it('keeps API withdrawal, defeat and guided teaching distinct',()=>{
    const s=state();s.api={bossKills:2};s.flow.phase='withdrawal';
    expect(voyageLog(s).at(-1).speaker).toBe('交班');
    s.flow.phase='defeat';expect(voyageLog(s).at(-1).speaker).toBe('返港');
    expect(routeBrief('tutorial-guide','grok')).toContain('试音');
  });
});
