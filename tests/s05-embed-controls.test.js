import test from 'node:test';
import assert from 'node:assert/strict';
import {touchKeys} from '../src/embed/controls.js';

test('touch controls honor declared keys, deduplicate and reject invalid keys', () => {
  assert.deepEqual(touchKeys({controls:'Space and X',touchKeys:['x','x',' ', 'Enter', 'invalid', null]}), ['x',' ','Enter']);
});
test('touch controls infer the same actions as the gallery', () => {
  assert.deepEqual(touchKeys({controls:'Use Space, X and Shift'}), [' ','x','Shift']);
  assert.deepEqual(touchKeys({controls:'Arrow keys'}), []);
});
