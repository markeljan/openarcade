export const DEFAULT_SITE_ORIGIN = 'https://openarcade.io';
export function siteOrigin(value=DEFAULT_SITE_ORIGIN) {
  const url=new URL(value);
  if(url.protocol!=='https:' || url.username || url.password || url.pathname!=='/' || url.search || url.hash)
    throw new Error('Site origin must be an HTTPS origin without credentials, path or query');
  return url.origin;
}
function browserOrigin() { return typeof location==='undefined'?DEFAULT_SITE_ORIGIN:location.origin; }
export function gameUrl(id,origin=browserOrigin()) {
  return new URL(id?`/games/${encodeURIComponent(id)}`:'/',origin);
}
export function embedUrl(id,origin=browserOrigin()) {
  return new URL(`/embed/${encodeURIComponent(id)}`,origin);
}
export function shareUrl(id,origin=browserOrigin(),embedsEnabled=true) {
  return id&&embedsEnabled?embedUrl(id,origin):gameUrl(id,origin);
}
export function gameIdFromLocation(value) {
  const url=value instanceof URL?value:new URL(value?.href ?? String(value),DEFAULT_SITE_ORIGIN);
  const match=/^\/(?:games|embed)\/([^/]+)\/?$/.exec(url.pathname);
  if(match) { try { return decodeURIComponent(match[1]); } catch { return null; } }
  return url.pathname==='/'?url.searchParams.get('game'):null;
}
