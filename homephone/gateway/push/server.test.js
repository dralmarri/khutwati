'use strict';
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createServer, DeviceStore, Apns, signJwt } = require('./server.js');

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

test('an unanswered call is logged as missed; an answered one is not', async () => {
  const { server, base, sent } = await start();
  await add(base, 300, 'dad', 'android', 'd'.repeat(64));
  const ring = async (from) => (await (await fetch(`${base}/internal/notify?ext=300&from=${from}`)).text()).split(',')[1];
  const missedFor = async (ext, pw, since = 0) =>
    (await (await fetch(`${base}/api/missed?since=${since}`, { headers: auth(ext, pw) })).json());

  const a = await ring('111');           // يُردّ عليها ثم تنتهي
  await fetch(`${base}/internal/answered?id=${a}`);
  await fetch(`${base}/internal/ended?id=${a}`);
  const b = await ring('222');           // يغلق المتصل قبل الرد
  await fetch(`${base}/internal/ended?id=${b}`);
  await fetch(`${base}/internal/ended?id=${b}`); // تكرار لا يضاعف السجل
  await tick();

  const list = await missedFor(300, 'dad');
  assert.deepStrictEqual(list.calls.map((c) => [c.id, c.from]), [[b, '222']]);
  assert.deepStrictEqual((await missedFor(301, 'family')).calls, []); // تحويلة أخرى لا تراها
  assert.deepStrictEqual((await missedFor(300, 'dad', list.now)).calls, []);
  const cancels = sent.filter((s) => s.payload.type === 'cancel').map((s) => s.payload.missed);
  assert.deepStrictEqual(cancels, ['0', '1']);
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

test('a storage failure is reported as a server error, not a bad request', async () => {
  const { server, base, store } = await start();
  store.save = () => { throw new Error('EACCES'); };
  assert.strictEqual((await add(base, 300, 'dad', 'ios', 'a'.repeat(64))).status, 500);
  const bad = await fetch(`${base}/api/devices`, { method: 'POST', headers: auth(300, 'dad'), body: '{oops' });
  assert.strictEqual(bad.status, 400);
  server.close();
});

test('a damaged APNs key file is detected at startup', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'apns-'));
  const good = path.join(dir, 'good.p8');
  const bad = path.join(dir, 'bad.p8');
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  fs.writeFileSync(good, pem);
  fs.writeFileSync(bad, pem.split('\n').slice(0, 2).join('\n'));
  const opts = { keyId: 'K', teamId: 'T', bundleId: 'b' };
  const ok = new Apns({ ...opts, keyFile: good });
  assert.strictEqual(ok.enabled, true);
  assert.strictEqual(ok.token().split('.').length, 3);
  const broken = new Apns({ ...opts, keyFile: bad });
  assert.strictEqual(broken.enabled, false);
  assert.match(broken.problem, /apns\.p8/);
});

test('a sender that throws is logged as a failed push', async () => {
  const logs = [];
  const boom = { enabled: true, send: async () => { throw new Error('kaboom'); } };
  const store = new DeviceStore(null);
  store.add('300', 'ios', 'a'.repeat(64));
  const server = createServer({ passwords: { 300: 'dad' }, store, apns: boom, fcm: boom, log: (m) => logs.push(m) });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  await fetch(`http://127.0.0.1:${server.address().port}/internal/notify?ext=300&from=1`);
  await tick();
  assert.ok(logs.some((l) => /push to ios \(300\) failed: exception: kaboom/.test(l)), logs.join(' | '));
  server.close();
});
