const MASTER_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const scriptUrl = req.query.url || MASTER_SCRIPT_URL;
      if (!scriptUrl) return res.status(500).json({ error: 'No script URL configured' });
      const response = await fetch(scriptUrl, { redirect: 'follow' });
      const text = await response.text();
      const data = JSON.parse(text);
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const scriptUrl = body.scriptUrl || MASTER_SCRIPT_URL;
      if (!scriptUrl) return res.status(500).json({ error: 'No script URL' });
      const { scriptUrl: _, ...forwardBody } = body;
      const response = await fetch(scriptUrl, {
        method: 'POST',
        body: JSON.stringify(forwardBody),
        headers: { 'Content-Type': 'application/json' },
        redirect: 'follow',
      });
      const text = await response.text();
      console.log('Apps Script response:', text.slice(0, 200));
      let data;
      try { data = JSON.parse(text); } catch { return res.status(200).json({ ok: true }); }
      return res.status(200).json(data);
    }
  } catch (err) {
    console.error('Proxy error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
