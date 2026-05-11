const http = require('http');
const https = require('https');

const CONF_NODE = 'sandboxconf.smithvcs.queensu.ca';
const MGMT_NODE = 'sandbox.smithvcs.queensu.ca';

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

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

  const options = {
    hostname: target,
    path: path,
    method: req.method,
    headers: { ...req.headers, host: target },
  };

  const proxy = https.request(options, r => {
    res.writeHead(r.statusCode, r.headers);
    r.pipe(res);
  });

  proxy.on('error', e => {
    console.error('Proxy error:', e.message);
    res.writeHead(502); res.end('Proxy error: ' + e.message);
  });

  req.pipe(proxy);

}).listen(3000, () => {
  console.log('Pexip proxy on http://localhost:3000');
  console.log('  Conf: https://' + CONF_NODE);
  console.log('  Mgmt: https://' + MGMT_NODE);
});
