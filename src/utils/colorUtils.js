export const hexToRgb = (hex) => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? {
    r: parseInt(r[1], 16),
    g: parseInt(r[2], 16),
    b: parseInt(r[3], 16),
  } : null;
};

export const darkenHex = (hex, amount = 0.25) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const d = (v) => Math.max(0, Math.floor(v * (1 - amount)));
  return `#${d(rgb.r).toString(16).padStart(2,'0')}${d(rgb.g).toString(16).padStart(2,'0')}${d(rgb.b).toString(16).padStart(2,'0')}`;
};

// Returns inline style object for a gradient from the team color
export const teamGradientStyle = (color) => {
  if (!color || !color.startsWith('#')) return null;
  return {
    background: `linear-gradient(135deg, ${color}, ${darkenHex(color, 0.3)})`,
  };
};

// Returns true if the stored value is a valid hex color
export const isHexColor = (val) => /^#[0-9a-f]{6}$/i.test(val);