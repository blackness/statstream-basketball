export const slugify = (str = '') =>
  str.toLowerCase()
     .replace(/\s+/g, '-')
     .replace(/[^a-z0-9-]/g, '')
     .replace(/-+/g, '-')
     .replace(/^-+|-+$/g, '');