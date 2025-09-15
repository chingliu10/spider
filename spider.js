import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  headless: false,        // Show browser
  slowMo: 1000,           // Slow down actions (1s per step)
  devtools: true,         // Open DevTools automatically
  defaultViewport: null,  // Use full screen
  args: [
    '--start-maximized',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor'
  ]
});

const page = await browser.newPage();

console.log('🌐 Navigating to TRA website...');
await page.goto('https://tanesw.tra.go.tz/', {
  waitUntil: 'networkidle2'
});

console.log('📱 Setting viewport size...');
await page.setViewport({ width: 1366, height: 768 });

await new Promise(resolve => setTimeout(resolve, 2000));

// 👉 Click the Login button to open popup
console.log('🔘 Clicking Login button...');
const loginBtn = page.locator('button[type="button"]', { hasText: "Login" });
await loginBtn.click();

// 👉 Wait for the ID input to appear
console.log('⌛ Waiting for login form...');
await page.waitForSelector('input[title="ID"]');

// 👉 Fill ID
console.log('✍️ Typing ID...');
await page.type('input[title="ID"]', '180332979');

// 👉 Fill Password
console.log('🔑 Typing Password...');
await page.type('input[type="password"]', 'Tanzania@2025');

// 👉 Click the Login (submit) button inside popup
console.log('🚀 Submitting login form...');
await page.click('button[type="submit"]');

// Keep open a bit so you can see the result
await new Promise(resolve => setTimeout(resolve, 8000));

console.log('🔚 Closing browser...');
await browser.close();

console.log('✨ Demo completed!');
