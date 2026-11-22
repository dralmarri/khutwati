'use strict';
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const { createServer, DeviceStore, signJwt } = require('./server.js');

function start() {
  const sent = [];
  const fake = { enabled: true, send: async (d, payload) => { sent.push({ d, payload }); return { ok: true }; } };
  const store = new DeviceStore(null);
  const server = createServer({ password: 'secret', store, apns: fake, fcm: fake, log: () => {} });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
    const base = `http://127.0.0.1:${server.address().port}`;
    resolve({ server, base, sent, store });
  }));
}
const auth = { authorization: 'Bearer secret', 'content-type': 'application/json' };

test('device registration needs the password', async () => {
  const { server, base, store } = await start();
  const body = JSON.stringify({ platform: 'ios', token: 'a'.repeat(64) });
  assert.strictEqual((await fetch(`${base}/api/devices`, { method: 'POST', body })).status, 401);
  assert.strictEqual((await fetch(`${base}/api/devices`, { method: 'POST', body, headers: { authorization: 'Bearer nope' } })).status, 401);
  assert.strictEqual((await fetch(`${base}/api/devices`, { method: 'POST', body, headers: auth })).status, 200);
  await fetch(`${base}/api/devices`, { method: 'POST', body, headers: auth });
  assert.strictEqual(store.devices.length, 1);
  server.close();
});

test('incoming call notifies every device and reports status until it ends', async () => {
  const { server, base, sent } = await start();
  for (const [platform, token] of [['ios', 'a'.repeat(64)], ['android', 'b'.repeat(64)]]) {
    await fetch(`${base}/api/devices`, { method: 'POST', headers: auth, body: JSON.stringify({ platform, token }) });
  }
  const [count, id] = (await (await fetch(`${base}/internal/notify?from=0501234567&name=Ali`)).text()).split(',');
  assert.strictEqual(count, '2');
  await new Promise((r) => setTimeout(r, 20));
  assert.deepStrictEqual(sent.find((s) => s.d.platform === 'ios').payload, { aps: {}, id, nameCaller: 'Ali', handle: '0501234567' });
  assert.strictEqual(sent.find((s) => s.d.platform === 'android').payload.type, 'call');

  const status = async () => (await (await fetch(`${base}/api/calls/${id}`, { headers: auth })).json()).status;
  assert.strictEqual(await status(), 'ringing');
  await fetch(`${base}/internal/ended?id=${id}`);
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(await status(), 'ended');
  const cancels = sent.filter((s) => s.payload.type === 'cancel');
  assert.strictEqual(cancels.length, 1);
  assert.strictEqual(cancels[0].d.platform, 'android');
  server.close();
});

test('internal routes are refused when the request came through the proxy', async () => {
  const { server, base } = await start();
  const res = await fetch(`${base}/internal/notify?from=1`, { headers: { 'x-forwarded-for': '203.0.113.9' } });
  assert.strictEqual(res.status, 404);
  server.close();
});

test('ES256 tokens verify with the matching public key', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwt = signJwt({ alg: 'ES256', kid: 'K' }, { iss: 'T', iat: 1 }, privateKey.export({ type: 'pkcs8', format: 'pem' }), 'ES256');
  const [h, c, s] = jwt.split('.');
  assert.ok(crypto.verify('sha256', Buffer.from(`${h}.${c}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url')));
});
