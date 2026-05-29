const http = require('http');
const https = require('https');

const CONF_NODE = 'sandboxconf.smithvcs.queensu.ca';
const MGMT_NODE = 'sandbox.smithvcs.queensu.ca';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'Sandbox2024';
const BASIC_AUTH = 'Basic ' + Buffer.from(`${ADMIN_USER}:${ADMIN_PASS}`).toString('base64');

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  let target, path;
  if (req.url.startsWith('/mgmt/')) {
    target = MGMT_NODE;
    path = req.url.replace('/mgmt', '');
  } else {
    target = CONF_NODE;
    path = req.url;
  }

  console.log(`→ ${req.method} https://${target}${path}`);

  // Buffer the full request body first
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    const body = Buffer.concat(chunks);

    const headers = {
      'host': target,
      'authorization': BASIC_AUTH,
      'content-type': req.headers['content-type'] || 'application/json',
      'accept': 'application/json',
    };
    if (body.length > 0) headers['content-length'] = body.length;

    console.log(`  Auth: ${BASIC_AUTH.slice(0, 25)}…`);
    if (body.length > 0) console.log(`  Body: ${body.toString().slice(0, 200)}`);

    const options = { hostname: target, path, method: req.method, headers };

    const proxy = https.request(options, r => {
      console.log(`  ← ${r.statusCode}`);
      const resChunks = [];
      r.on('data', c => resChunks.push(c));
      r.on('end', () => {
        const resBody = Buffer.concat(resChunks);
        if (r.statusCode >= 400) console.log(`  ← body: ${resBody.toString().slice(0, 300)}`);
        res.writeHead(r.statusCode, {
          'content-type': r.headers['content-type'] || 'application/json',
          'access-control-allow-origin': '*',
        });
        res.end(resBody);
      });
    });

    proxy.on('error', e => {
      console.error('Proxy error:', e.message);
      res.writeHead(502); res.end('Proxy error: ' + e.message);
    });

    if (body.length > 0) proxy.write(body);
    proxy.end();
  });

}).listen(3000, () => {
  console.log('Pexip proxy on http://localhost:3000');
  console.log('  Conf: https://' + CONF_NODE);
  console.log('  Mgmt: https://' + MGMT_NODE);
  console.log('  Auth: ' + ADMIN_USER + ' (injected by proxy)');
});
