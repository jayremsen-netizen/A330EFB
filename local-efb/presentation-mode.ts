// Every presentation iframe has a distinct namespace, including concurrently open demos.
const params = new URLSearchParams(location.search);
export const presentationMode = params.get('demo-session') === '1';
const requestedSession = params.get('session') || '';
export const presentationSession = presentationMode
  ? (/^[a-zA-Z0-9_-]{1,128}$/.test(requestedSession) ? requestedSession : crypto.randomUUID())
  : '';
if (presentationMode && requestedSession !== presentationSession) {
  params.set('session', presentationSession);
  history.replaceState(history.state, '', `${location.pathname}?${params}${location.hash}`);
}
export const presentationPrefix = `A339_BID_DEMO:${presentationSession}:`;
export const storageName = (key:string) => presentationMode ? presentationPrefix+key : key;
if (presentationMode && params.get('reset') === '1') {
  for (const key of Object.keys(localStorage)) if (key.startsWith(presentationPrefix)) localStorage.removeItem(key);
}
