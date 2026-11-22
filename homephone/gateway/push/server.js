'use strict';
// خدمة الإشعارات: تحفظ رموز الأجهزة، وعند ورود مكالمة ترسل إشعار VoIP إلى آيفون (APNs)
// وإشعار بيانات عالي الأولوية إلى أندرويد (FCM). لا تعتمد على أي مكتبة خارجية.

const http = require('node:http');
const http2 = require('node:http2');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const b64url = (v) => Buffer.from(v).toString('base64url');

function signJwt(header, claims, key, alg) {
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const sig = alg === 'ES256'
    ? crypto.sign('sha256', Buffer.from(input), { key, dsaEncoding: 'ieee-p1363' })
    : crypto.sign('sha256', Buffer.from(input), key);
  return `${input}.${sig.toString('base64url')}`;
}

function safeEqual(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

// ---------- تخزين الأجهزة ----------
class DeviceStore {
  constructor(file) {
    this.file = file;
    this.devices = [];
    try { this.devices = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* أول تشغيل */ }
  }
  save() {
    if (!this.file) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.devices, null, 2));
  }
  add(platform, token) {
    const found = this.devices.find((d) => d.token === token);
    if (found) { found.platform = platform; found.seen = Date.now(); } else {
      this.devices.push({ platform, token, seen: Date.now() });
    }
    this.save();
  }
  remove(token) {
    const before = this.devices.length;
    this.devices = this.devices.filter((d) => d.token !== token);
    if (this.devices.length !== before) this.save();
  }
}

// ---------- APNs (آيفون) ----------
class Apns {
  constructor({ keyFile, keyId, teamId, bundleId }) {
    this.enabled = Boolean(keyId && teamId && bundleId && keyFile && fs.existsSync(keyFile));
    if (!this.enabled) return;
    this.key = fs.readFileSync(keyFile, 'utf8');
    this.keyId = keyId; this.teamId = teamId; this.topic = `${bundleId}.voip`;
    this.jwt = null; this.jwtAt = 0;
  }
  token() {
    // Apple تطلب تجديد الرمز خلال ساعة ولا تقبل تجديده أكثر من مرة كل 20 دقيقة
    if (!this.jwt || Date.now() - this.jwtAt > 40 * 60 * 1000) {
      this.jwtAt = Date.now();
      this.jwt = signJwt({ alg: 'ES256', kid: this.keyId },
        { iss: this.teamId, iat: Math.floor(this.jwtAt / 1000) }, this.key, 'ES256');
    }
    return this.jwt;
  }
  post(host, deviceToken, payload) {
    return new Promise((resolve) => {
      const client = http2.connect(`https://${host}`);
      const done = (r) => { client.close(); resolve(r); };
      client.on('error', (e) => done({ status: 0, reason: e.message }));
      const req = client.request({
        ':method': 'POST', ':path': `/3/device/${deviceToken}`,
        authorization: `bearer ${this.token()}`,
        'apns-topic': this.topic, 'apns-push-type': 'voip',
        'apns-priority': '10', 'apns-expiration': '0',
      });
      let status = 0; let body = '';
      req.setTimeout(8000, () => { req.close(); done({ status: 0, reason: 'timeout' }); });
      req.on('response', (h) => { status = h[':status']; });
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        let reason = '';
        try { reason = JSON.parse(body).reason || ''; } catch { /* لا يوجد جسم عند النجاح */ }
        done({ status, reason });
      });
      req.on('error', (e) => done({ status: 0, reason: e.message }));
      req.end(JSON.stringify(payload));
    });
  }
  // النسخ المثبتة من Xcode تستخدم بيئة التطوير، ونسخ TestFlight والمتجر تستخدم بيئة الإنتاج.
  // نجرّب البيئة المحفوظة للجهاز ثم الأخرى ونحفظ التي نجحت.
  async send(device, payload) {
    const hosts = ['api.push.apple.com', 'api.sandbox.push.apple.com'];
    if (device.sandbox) hosts.reverse();
    let last;
    for (const host of hosts) {
      last = await this.post(host, device.token, payload);
      if (last.status === 200) { device.sandbox = host.includes('sandbox'); return { ok: true }; }
      if (last.reason !== 'BadDeviceToken') break;
    }
    const gone = last.status === 410 || last.reason === 'Unregistered' || last.reason === 'BadDeviceToken';
    return { ok: false, gone, detail: `${last.status} ${last.reason}` };
  }
}

// ---------- FCM (أندرويد) ----------
class Fcm {
  constructor({ serviceAccountFile }) {
    this.enabled = Boolean(serviceAccountFile && fs.existsSync(serviceAccountFile));
    if (!this.enabled) return;
    this.sa = JSON.parse(fs.readFileSync(serviceAccountFile, 'utf8'));
    this.access = null; this.accessExp = 0;
  }
  async accessToken() {
    if (this.access && Date.now() < this.accessExp - 60000) return this.access;
    const now = Math.floor(Date.now() / 1000);
    const assertion = signJwt({ alg: 'RS256', typ: 'JWT' }, {
      iss: this.sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
    }, this.sa.private_key, 'RS256');
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', signal: AbortSignal.timeout(8000),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    });
    if (!res.ok) throw new Error(`oauth ${res.status}`);
    const j = await res.json();
    this.access = j.access_token; this.accessExp = Date.now() + j.expires_in * 1000;
    return this.access;
  }
  async send(device, data) {
    try {
      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${this.sa.project_id}/messages:send`, {
        method: 'POST', signal: AbortSignal.timeout(8000),
        headers: { authorization: `Bearer ${await this.accessToken()}`, 'content-type': 'application/json' },
        body: JSON.stringify({ message: { token: device.token, data, android: { priority: 'HIGH', ttl: '30s' } } }),
      });
      if (res.ok) return { ok: true };
      return { ok: false, gone: res.status === 404, detail: `${res.status}` };
    } catch (e) { return { ok: false, detail: e.message }; }
  }
}

// ---------- الخادم ----------
function createServer({ password, store, apns, fcm, log = console.log }) {
  const calls = new Map(); // id -> { status, from, name, at }

  const prune = () => {
    for (const [id, c] of calls) if (Date.now() - c.at > 10 * 60 * 1000) calls.delete(id);
  };

  async function fanout(build) {
    const results = await Promise.all(store.devices.map(async (d) => {
      const sender = d.platform === 'ios' ? apns : fcm;
      if (!sender || !sender.enabled) return { d, r: { ok: false, detail: 'not configured' } };
      const payload = build(d);
      if (!payload) return { d, r: { ok: true, skipped: true } };
      return { d, r: await sender.send(d, payload) };
    }));
    for (const { d, r } of results) {
      if (!r.ok) log(`push to ${d.platform} failed: ${r.detail}`);
      if (r.gone) store.remove(d.token);
    }
    store.save();
  }

  const json = (res, code, obj) => {
    res.writeHead(code, { 'content-type': 'application/json' });
    res.end(JSON.stringify(obj));
  };
  const text = (res, code, body) => { res.writeHead(code, { 'content-type': 'text/plain' }); res.end(body); };

  const readBody = (req) => new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 8192) { reject(new Error('too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });

  const authed = (req) => {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
    return Boolean(password) && Boolean(m) && safeEqual(m[1], password);
  };
  // Caddy يضيف X-Forwarded-For لكل طلب قادم من الإنترنت. المسارات الداخلية تُقبل من Asterisk المحلي فقط.
  const isLocal = (req) => !req.headers['x-forwarded-for']
    && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const p = url.pathname;

      if (p === '/internal/notify' && isLocal(req)) {
        prune();
        const id = crypto.randomUUID();
        const from = (url.searchParams.get('from') || '').slice(0, 64);
        const name = (url.searchParams.get('name') || '').slice(0, 64);
        calls.set(id, { status: 'ringing', from, name, at: Date.now() });
        log(`incoming call ${id} from ${from}`);
        const count = store.devices.length;
        // لا ننتظر مزوّدي الإشعارات حتى لا نؤخّر الرنين
        fanout((d) => (d.platform === 'ios'
          ? { aps: {}, id, nameCaller: name || from, handle: from }
          : { type: 'call', id, nameCaller: name || from, handle: from })).catch((e) => log(e.message));
        return text(res, 200, `${count},${id}`);
      }
      if (p === '/internal/ended' && isLocal(req)) {
        const id = url.searchParams.get('id') || '';
        const c = calls.get(id);
        if (c && c.status !== 'ended') {
          c.status = 'ended';
          // آيفون لا يقبل إشعار VoIP لغير مكالمة جديدة، فالتطبيق يستعلم عن الحالة بنفسه
          fanout((d) => (d.platform === 'ios' ? null : { type: 'cancel', id })).catch((e) => log(e.message));
        }
        return text(res, 200, 'ok');
      }
      if (p === '/api/health') return json(res, 200, { ok: true });

      if (!p.startsWith('/api/')) return json(res, 404, { error: 'not found' });
      if (!authed(req)) return json(res, 401, { error: 'unauthorized' });

      if (p === '/api/devices' && req.method === 'POST') {
        const b = await readBody(req);
        if (!['ios', 'android'].includes(b.platform) || typeof b.token !== 'string'
          || b.token.length < 16 || b.token.length > 4096) return json(res, 400, { error: 'bad request' });
        store.add(b.platform, b.token);
        return json(res, 200, { ok: true, push: Boolean((b.platform === 'ios' ? apns : fcm)?.enabled) });
      }
      if (p === '/api/devices' && req.method === 'DELETE') {
        const b = await readBody(req);
        if (typeof b.token === 'string') store.remove(b.token);
        return json(res, 200, { ok: true });
      }
      const m = /^\/api\/calls\/([0-9a-f-]{36})$/.exec(p);
      if (m && req.method === 'GET') {
        const c = calls.get(m[1]);
        return json(res, 200, { status: c ? c.status : 'ended' });
      }
      return json(res, 404, { error: 'not found' });
    } catch (e) {
      return json(res, 400, { error: 'bad request' });
    }
  });
}

module.exports = { createServer, DeviceStore, Apns, Fcm, signJwt };

if (require.main === module) {
  const env = process.env;
  if (!env.MOBILE_PASSWORD) { console.error('MOBILE_PASSWORD غير معرّف'); process.exit(1); }
  const apns = new Apns({ keyFile: env.APNS_KEY_FILE, keyId: env.APNS_KEY_ID, teamId: env.APNS_TEAM_ID, bundleId: env.APNS_BUNDLE_ID });
  const fcm = new Fcm({ serviceAccountFile: env.FCM_SERVICE_ACCOUNT_FILE });
  const store = new DeviceStore(path.join(env.DATA_DIR || '.', 'devices.json'));
  console.log(`APNs: ${apns.enabled ? 'on' : 'off'}, FCM: ${fcm.enabled ? 'on' : 'off'}, devices: ${store.devices.length}`);
  createServer({ password: env.MOBILE_PASSWORD, store, apns, fcm })
    .listen(Number(env.PUSH_PORT || 3000), '127.0.0.1');
}
