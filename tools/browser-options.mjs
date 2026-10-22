/** Installed Chrome on Windows; Playwright's downloaded Chromium on CI/Linux. */
export function browserOptions() {
  return {
    headless: true,
    executablePath: process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined),
    args: process.env.WEBGL_BACKEND === 'd3d11'
      ? ['--use-angle=d3d11', '--ignore-gpu-blocklist']
      : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  };
}
