'use strict';
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const { createServer, DeviceStore, signJwt } = require('./server.js');

function start() {
  const sent = [];
  const fake = { enabled: true, send: async (d, payload) => { sent.push({ d, payload }); return { ok: true }; } };
  const store = new DeviceStore(null);
  const server = createServer({ passwords: { 300: 'dad', 301: 'family' }, store, apns: fake, fcm: fake, log: () => {} });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
    const base = `http://127.0.0.1:${server.address().port}`;
    resolve({ server, base, sent, store });
  }));
}
const auth = (ext, pw) => ({ authorization: `Bearer ${ext}:${pw}`, 'content-type': 'application/json' });
const add = (base, ext, pw, platform, token) => fetch(`${base}/api/devices`, {
  method: 'POST', headers: auth(ext, pw), body: JSON.stringify({ platform, token }),
});
const tick = () => new Promise((r) => setTimeout(r, 20));

test('each extension has its own password', async () => {
  const { server, base, store } = await start();
  const token = 'a'.repeat(64);
  const body = JSON.stringify({ platform: 'ios', token });
  assert.strictEqual((await fetch(`${base}/api/devices`, { method: 'POST', body })).status, 401);
  assert.strictEqual((await add(base, 300, 'family', 'ios', token)).status, 401);
  assert.strictEqual((await add(base, 302, 'dad', 'ios', token)).status, 401);
  assert.strictEqual((await add(base, 300, 'dad', 'ios', token)).status, 200);
  await add(base, 300, 'dad', 'ios', token);
  assert.deepStrictEqual(store.devices.map((d) => d.ext), ['300']);
  // الجهاز نفسه ينتقل إلى التحويلة الأخرى بدل أن يتكرر
  await add(base, 301, 'family', 'ios', token);
  assert.deepStrictEqual(store.devices.map((d) => d.ext), ['301']);
  server.close();
});

test('a call rings only the devices of the called extension', async () => {
  const { server, base, sent } = await start();
  await add(base, 300, 'dad', 'ios', 'a'.repeat(64));
  await add(base, 301, 'family', 'ios', 'b'.repeat(64));
  await add(base, 301, 'family', 'android', 'c'.repeat(64));

  const [count, id] = (await (await fetch(`${base}/internal/notify?ext=301&from=0501234567&name=Ali`)).text()).split(',');
  assert.strictEqual(count, '2');
  await tick();
  assert.deepStrictEqual(sent.map((s) => s.d.ext), ['301', '301']);
  assert.deepStrictEqual(sent.find((s) => s.d.platform === 'ios').payload, { aps: {}, id, nameCaller: 'Ali', handle: '0501234567' });
  assert.strictEqual(sent.find((s) => s.d.platform === 'android').payload.type, 'call');

  const status = async (ext, pw) => (await (await fetch(`${base}/api/calls/${id}`, { headers: auth(ext, pw) })).json()).status;
  assert.strictEqual(await status(301, 'family'), 'ringing');
  assert.strictEqual(await status(300, 'dad'), 'ended'); // التحويلة الأخرى لا ترى المكالمة
  await fetch(`${base}/internal/ended?id=${id}`);
  await tick();
  assert.strictEqual(await status(301, 'family'), 'ended');
  const cancels = sent.filter((s) => s.payload.type === 'cancel');
  assert.deepStrictEqual(cancels.map((s) => [s.d.ext, s.d.platform]), [['301', 'android']]);
  server.close();
});

test('internal routes are refused when the request came through the proxy', async () => {
  const { server, base } = await start();
  const res = await fetch(`${base}/internal/notify?ext=300&from=1`, { headers: { 'x-forwarded-for': '203.0.113.9' } });
  assert.strictEqual(res.status, 404);
  server.close();
});

test('ES256 tokens verify with the matching public key', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwt = signJwt({ alg: 'ES256', kid: 'K' }, { iss: 'T', iat: 1 }, privateKey.export({ type: 'pkcs8', format: 'pem' }), 'ES256');
  const [h, c, s] = jwt.split('.');
  assert.ok(crypto.verify('sha256', Buffer.from(`${h}.${c}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url')));
});
