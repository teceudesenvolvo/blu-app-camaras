const test = require('node:test');
const assert = require('node:assert/strict');
const resolve = require('../app.config');
const base = require('../app.json').expo;

test('preserves released Paraipaba identifiers and isolates update project', () => {
  const original = process.env.CAMARA;
  process.env.CAMARA = 'paraipaba';
  try {
    const result = resolve({ config: structuredClone(base) });
    assert.equal(result.ios.bundleIdentifier, 'com.bluappcmparaipaba');
    assert.equal(result.android.package, 'com.blutecnologias.appcamara');
    assert.equal(result.extra.firebase.projectId, 'blu-app-camara');
    assert.equal(result.updates.url, 'https://u.expo.dev/' + result.extra.eas.projectId);
    assert.equal(result.extra.flavorId, 'paraipaba');
    assert.equal(result.version, base.version);
    assert.match(result.extra.videosEndpoint, /southamerica-east1-blu-app-camara/);
  } finally {
    if (original === undefined) delete process.env.CAMARA;
    else process.env.CAMARA = original;
  }
});

test('unknown or invalid chambers never fall back to Paraipaba', () => {
  const original = process.env.CAMARA;
  try {
    for (const chamber of ['nao-configurada', '../paraipaba']) {
      process.env.CAMARA = chamber;
      assert.throws(() => resolve({ config: structuredClone(base) }));
    }
  } finally {
    if (original === undefined) delete process.env.CAMARA;
    else process.env.CAMARA = original;
  }
});
