import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source = await readFile(new URL('../src/feature-games9.js', import.meta.url), 'utf8');
const patched = source.replace("'./audio.js'", JSON.stringify(new URL('../src/audio.js', import.meta.url).href))
  .replace('return {input(k,d){keys[k]=d},update(dt,auto){bust=', "return {fixture(h){heat=h;garage={x,y:410,vehicle:'bike'}},input(k,d){keys[k]=d},update(dt,auto){bust=");
assert.notEqual(patched, source);
const {pursuit} = await import(`data:text/javascript;base64,${Buffer.from(patched).toString('base64')}`);

for (const auto of [false, true]) {
  test(`${auto ? 'AI' : 'manual'} garage contact immediately counts swap and drops heat`, () => {
    for (const [startingHeat, expectedHeat, escapes] of [[80,17,1],[30,19,0],[8,7,0]]) {
      const cues=[];
      const g=pursuit(cue=>cues.push(cue));
      g.fixture(startingHeat);
      g.update(1/60,auto);
      let s=g.snapshot();
      assert.equal(s.swap,1);
      assert.equal(s.heat,expectedHeat);
      assert.equal(s.escapes,escapes);
      assert.equal(s.vehicle,'coupe');
      assert.equal(s.swapTarget,'bike');
      assert.ok(s.swapTimer>0);
      assert.ok(cues.includes('pursuit-swap'));
      for(let i=0;i<85;i++)g.update(1/60,auto);
      s=g.snapshot();
      assert.equal(s.swap,1);
      assert.equal(s.escapes,escapes);
      assert.equal(s.vehicle,'bike');
      assert.equal(s.swapTarget,null);
    }
  });
}
