import test from 'node:test';
import assert from 'node:assert/strict';

test('audio imports and remains usable when the storage getter itself is denied',async()=>{
  const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('Storage blocked')}});
  try {
    const audio=await import('../src/audio.js?s05-storage-denied');
    assert.equal(audio.getSoundEnabled(),false);
    assert.doesNotThrow(()=>audio.setSoundEnabled(true));
    assert.equal(audio.getSoundEnabled(),true);
    const preview=audio.createGameAudio(false);
    assert.doesNotThrow(()=>{preview.emit('shoot');preview.destroy()});
    audio.setSoundEnabled(false);
  }finally{
    if(original)Object.defineProperty(globalThis,'localStorage',original);
    else delete globalThis.localStorage;
  }
});
