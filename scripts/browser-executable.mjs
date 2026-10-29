import {existsSync} from 'node:fs';

// CI supplies its pinned Playwright browser. Local npm test keeps using Chrome/Edge.
const explicit = process.env.OPENARCADE_TEST_BROWSER;
if (explicit && !existsSync(explicit)) {
  throw new Error(`OPENARCADE_TEST_BROWSER does not exist: ${explicit}`);
}
export const testBrowser = explicit || (process.platform === 'win32'
  ? ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']
  : process.platform === 'darwin'
    ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
    : ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']
).find(existsSync);
