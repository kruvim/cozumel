'use strict';
// Storage: Vercel Blob (private, free tier) in production; local JSON file for tests (COZUMEL_LOCAL_STORE=1).
var PATH = 'cozumel/progress.json';
var fs = require('fs'), nodePath = require('path');
var LOCAL = nodePath.join(process.env.COZUMEL_LOCAL_DIR || process.cwd(), '.local-store.json');

async function read() {
  if (process.env.COZUMEL_LOCAL_STORE) { try { return JSON.parse(fs.readFileSync(LOCAL, 'utf8')); } catch (e) { return null; } }
  var blob = require('@vercel/blob');
  var r = await blob.get(PATH, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200) return null;
  return JSON.parse(await new Response(r.stream).text());
}
async function write(doc) {
  if (process.env.COZUMEL_LOCAL_STORE) { fs.writeFileSync(LOCAL, JSON.stringify(doc)); return; }
  var blob = require('@vercel/blob');
  await blob.put(PATH, JSON.stringify(doc), { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json', cacheControlMaxAge: 60 });
}
module.exports = { read: read, write: write };
