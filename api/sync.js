'use strict';
// GET  /api/sync            -> { ok, state, updatedAt }
// POST /api/sync {state}    -> merges into stored state, returns merged
// POST /api/sync {reset:true,state} -> replaces stored state
// Auth: header x-cozumel-key must equal env COZUMEL_PASSWORD (never in code).
var crypto = require('crypto');
var store = require('./_store');
var M = require('../js/merge.js');

function same(a, b) {
  var x = crypto.createHash('sha256').update(String(a)).digest(), y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}
function send(res, code, body) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); }
async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  var chunks = []; var n = 0;
  for await (var c of req) { n += c.length; if (n > 1e6) throw new Error('too large'); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-cozumel-key');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  var secret = process.env.COZUMEL_PASSWORD;
  if (!secret) return send(res, 503, { ok: false, error: 'not_configured' });
  var given = req.headers['x-cozumel-key'] || '';
  if (!same(given, secret)) { await new Promise(function (r) { setTimeout(r, 600); }); return send(res, 401, { ok: false, error: 'unauthorized' }); }
  try {
    var doc = await store.read();
    if (req.method === 'GET') return send(res, 200, { ok: true, state: doc ? doc.state : null, updatedAt: doc ? doc.updatedAt : null });
    if (req.method === 'POST') {
      var body = await readBody(req);
      if (!body || typeof body.state !== 'object' || !body.state) return send(res, 400, { ok: false, error: 'bad_request' });
      var merged = body.reset === true ? M.merge(body.state, null) : M.merge(doc ? doc.state : null, body.state);
      var out = { state: merged, updatedAt: Date.now() };
      await store.write(out);
      return send(res, 200, { ok: true, state: out.state, updatedAt: out.updatedAt });
    }
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  } catch (e) {
    return send(res, 500, { ok: false, error: 'server_error' });
  }
};
