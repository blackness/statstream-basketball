const MASTER_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  if (!MASTER_SCRIPT_URL) {
    // Fallback: return empty profiles so app still works
    return res.status(200).json({ ok: true, profiles: [] });
  }

  try {
    // Fetch master sheet's profiles tab
    const response = await fetch(MASTER_SCRIPT_URL + '?sheet=profiles', { redirect: 'follow' });
    const text = await response.text();
    const data = JSON.parse(text);
    // data.profiles should be array of {name, script_url, initials}
    const profiles = (data.profiles || data.entries || []).map(p => ({
      name: p.name || p.Name || '',
      script_url: p.script_url || p.scriptUrl || p['script_url'] || '',
      initials: p.initials || p.Initials || (p.name||'').slice(0,2).toUpperCase(),
    })).filter(p => p.name);
    return res.status(200).json({ ok: true, profiles });
  } catch (err) {
    console.error('Profiles error:', err.message);
    return res.status(200).json({ ok: true, profiles: [] });
  }
};
