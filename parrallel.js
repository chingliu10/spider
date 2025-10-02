import puppeteer from 'puppeteer';
import fs from 'fs/promises';

// 👤 Users with credentials
const users = [
  { id: "168733283", password: "Jesusmy01@" },//mizigo yote million 70
  { id: "111079994", password: "Apechealolo@12" },//mizigo yote million 80
  { id: "142936062", password: "Apechealolo@10" },//90
  { id: "173501013", password: "Princekim@123" },//100
  { id: "USER5_ID", password: "USER5_PASS" }
];

// 🕹 Function to run a single Puppeteer instance
async function runInstance(user, instanceNum) {
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 200, // smoother automation
    defaultViewport: null,
    args: ['--start-maximized']
  });

  try {
    const page = await browser.newPage();

    console.log(`🌐 [User ${user.id} - Instance ${instanceNum}] Navigating...`);
    await page.goto('https://tanesw.tra.go.tz/', { waitUntil: 'networkidle2' });

    await page.setViewport({ width: 1366, height: 768 });

    // Click login
    const loginBtn = await page.waitForSelector('button:has-text("Login")', { timeout: 20000 });
    await loginBtn.click();

    // Fill login form
    await page.waitForSelector('input[title="ID"]');
    await page.type('input[title="ID"]', user.id, { delay: 100 });
    await page.type('input[type="password"]', user.password, { delay: 100 });

    // Submit login
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    console.log(`✅ [User ${user.id} - Instance ${instanceNum}] Logged in!`);

    // ... add your bidding logic here ...
    
  } catch (err) {
    console.error(`❌ [User ${user.id} - Instance ${instanceNum}] Error:`, err.message);
  } finally {
    // await browser.close(); // keep open for debugging
  }
}

// 🔁 Run 5 users × 3 instances each
async function main() {
  const tasks = [];

  for (const user of users) {
    for (let i = 1; i <= 3; i++) {
      tasks.push(runInstance(user, i));
    }
  }

  await Promise.all(tasks); // run all in parallel
}

main();
