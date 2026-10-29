import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {chromium} from 'playwright';

// Require the build and browser instead of silently skipping their fixtures.
if (!existsSync('dist/embed/snake.html')) {
  throw new Error('Build output is missing. Run npm run ci, or npm run build before npm run test:ci.');
}
// Launch the pinned headless shell to verify its OS libraries and startup, then
// give the same executable to the existing CDP fixtures without hardcoded paths.
const browser = await chromium.launchServer({headless: true, host: '127.0.0.1', timeout: 20000});
const executable = browser.process().spawnfile;
await browser.close();
console.log('Pinned Chromium startup passed. Running the full test suite serially.');

const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1'], {
  stdio: 'inherit', windowsHide: true, timeout: 15 * 60 * 1000,
  env: {...process.env, OPENARCADE_TEST_BROWSER: executable},
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
