import { pathToFileURL } from 'node:url';

export function validateCommunityConfig(url = '', key = '') {
  if (!url && !key) return false;
  if (!url || !key) throw new Error('Set both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or leave both empty for preview mode.');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' && !(['localhost', '127.0.0.1'].includes(parsed.hostname) && parsed.protocol === 'http:')) throw new Error('The Supabase URL must use HTTPS, except for a local Supabase instance.');
  if (key.startsWith('sb_secret_')) throw new Error('A secret Supabase key cannot be embedded in a public frontend. Use the publishable key.');
  if (key.includes('.')) {
    let payload;
    try { payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()); }
    catch { throw new Error('The Supabase key is not a valid publishable or legacy anon key.'); }
    if (payload.role !== 'anon') throw new Error('Only a publishable key or a legacy anon key can be used in the frontend.');
  } else if (!key.startsWith('sb_publishable_')) throw new Error('Use the project publishable key from Supabase API settings.');
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const configured = validateCommunityConfig(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  console.log(configured ? 'Shared community configuration found.' : 'Community preview: no shared backend configured.');
}
