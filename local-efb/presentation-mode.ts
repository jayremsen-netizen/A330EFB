// A presentation session has its own browser storage namespace.
export const presentationMode = new URLSearchParams(location.search).get('demo-session') === '1';
export const presentationPrefix = 'A339_BID_DEMO:';
export const storageName = (key:string) => presentationMode ? presentationPrefix+key : key;
if (presentationMode && new URLSearchParams(location.search).get('reset') === '1') {
  for (const key of Object.keys(localStorage)) if (key.startsWith(presentationPrefix)) localStorage.removeItem(key);
}
