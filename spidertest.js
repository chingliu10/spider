
// 👉 Click the Login button to open popup
console.log('🔘 Clicking Login button...');
const loginBtn = page.locator('button[type="button"]', { hasText: "Login" });
await loginBtn.click();

// 👉 Wait for the ID input to appear
console.log('⌛ Waiting for login form...');
await page.waitForSelector('input[title="ID"]');

// 👉 Fill ID
console.log('✍️ Typing ID...');
await page.type('input[title="ID"]', '115832220');

// 👉 Fill Password
console.log('🔑 Typing Password...');
await page.type('input[type="password"]', 'Tesha2020**');

// 👉 Click the Login (submit) button inside popup
console.log('🚀 Submitting login form...');
await page.click('button[type="submit"]');

// Wait for 10 seconds for the page to load
console.log('⌛ Waiting for 10 seconds...');
await new Promise(resolve => setTimeout(resolve, 30000));


// ... (Your existing login code)

// After you've successfully logged in and the new dashboard page is visible.
console.log('⌛ Waiting for "Auction" button to appear...');
// A more robust selector: find the parent div with 'cursor-pointer'
// ... (Your existing login code)

console.log('⌛ Waiting for "Auction" button to appear...');

// Define the locator, which is a strategy for finding the element.
const auctionButton = page.locator('div.cursor-pointer', { hasText: 'Auction' });

// Use page.evaluate() to run a function that gets the innerHTML.
const buttonInnerHtml = await page.evaluate(el => el.innerHTML, auctionButton);

console.log('✅ The "Auction" element was found! Its inner HTML is:');
console.log(buttonInnerHtml);

// To click it, use the locator's click() method, which works as intended

// Keep the browser open for a bit to see the result

console.log('✨ Demo completed!');
