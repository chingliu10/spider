import puppeteer from 'puppeteer';


// Add "type": "module" to your package.json file to use this syntax.
import fs from 'fs/promises';

const browser = await puppeteer.launch({
  headless: false,        // Show browser
  slowMo: 1000,           // Slow down actions (1s per step)
  devtools: false,         // Open DevTools automatically
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

  console.log('✨ Script completed! The browser will remain open.');
  console.log('⌛ Finding all <h2> elements...');
  // The $$() method returns an array of element handles.

  
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

  const h2Elements = await page.$$('h2');

  console.log(`✅ Found ${h2Elements.length} <h2> elements.`);

  if (h2Elements.length > 2) {
    const h2 = h2Elements[2]; // third element (index 2)

    // Get parent element's outer HTML
    const parentHtml = await page.evaluate(el => el.parentElement.outerHTML, h2);

    console.log('-----------------------------------');
    console.log('🚀 Parent Element HTML:');
    console.log(parentHtml);
    console.log('-----------------------------------');

    // Get parent's next sibling outer HTML
    const nextSiblingHtml = await page.evaluate(el => el.parentElement.nextElementSibling?.outerHTML, h2);

    console.log('-----------------------------------');
    console.log('🚀 Parent\'s Next Sibling HTML:');
    console.log(nextSiblingHtml);
    console.log('-----------------------------------');

    // Get the first child element inside parent's next sibling
    const firstChildHtml = await page.evaluate(el => {
      const nextSibling = el.parentElement.nextElementSibling;
      return nextSibling && nextSibling.firstElementChild
        ? nextSibling.firstElementChild.outerHTML
        : null;
    }, h2);

    console.log('-----------------------------------');
    console.log('🚀 First Child of Parent\'s Next Sibling HTML:');
    console.log(firstChildHtml);
    console.log('-----------------------------------');

    // Go inside again: get the first child of the first child
    const deepChildHtml = await page.evaluate(el => {
      const nextSibling = el.parentElement.nextElementSibling;
      const firstChild = nextSibling && nextSibling.firstElementChild;
      return firstChild && firstChild.firstElementChild
        ? firstChild.firstElementChild.outerHTML
        : null;
    }, h2);

    console.log('-----------------------------------');
    console.log('🚀 First Child of First Child (Deep) HTML:');
    console.log(deepChildHtml);
    console.log('-----------------------------------');

    // Go even deeper: get the first child of the deep child
    const deeperChildHtml = await page.evaluate(el => {
      const nextSibling = el.parentElement.nextElementSibling;
      const firstChild = nextSibling && nextSibling.firstElementChild;
      const deepChild = firstChild && firstChild.firstElementChild;
      return deepChild && deepChild.firstElementChild
        ? deepChild.firstElementChild.outerHTML
        : null;
    }, h2);

    console.log('-----------------------------------');
    console.log('🚀 First Child of Deep Child HTML:');
    console.log(deeperChildHtml);
    console.log('-----------------------------------');

    const deeperChildBox = await page.evaluate(el => {
      const nextSibling = el.parentElement.nextElementSibling;
      const firstChild = nextSibling && nextSibling.firstElementChild;
      const deepChild = firstChild && firstChild.firstElementChild;
      const deeperChild = deepChild && deepChild.firstElementChild;
      if (deeperChild) {
        const rect = deeperChild.getBoundingClientRect();
        return {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        };
      }
      return null;
    }, h2);

    console.log('-----------------------------------');
    console.log('📦 Position and Size of Deeper Child:');
    console.log(deeperChildBox);
    console.log('-----------------------------------');

    if (deeperChildBox) {
      const centerX = deeperChildBox.x + deeperChildBox.width / 2;
      const centerY = deeperChildBox.y + deeperChildBox.height / 2;

      // Scroll to the deeper child element
      await page.evaluate(el => {
        const nextSibling = el.parentElement.nextElementSibling;
        const firstChild = nextSibling && nextSibling.firstElementChild;
        const deepChild = firstChild && firstChild.firstElementChild;
        const deeperChild = deepChild && deepChild.firstElementChild;
        if (deeperChild) {
          deeperChild.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
      }, h2);

      console.log('🖱️ Scrolled to center of deeper child element.');

      // Wait a moment for scroll animation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get info about the element to be clicked
      const clickedElementInfo = await page.evaluate(el => {
        const nextSibling = el.parentElement.nextElementSibling;
        const firstChild = nextSibling && nextSibling.firstElementChild;
        const deepChild = firstChild && firstChild.firstElementChild;
        const deeperChild = deepChild && deepChild.firstElementChild;
        if (deeperChild) {
          return {
            tag: deeperChild.tagName,
            class: deeperChild.className,
            text: deeperChild.textContent.trim()
          };
        }
        return null;
      }, h2);

      // Click at the center of the deeper child element
      await page.mouse.click(centerX, centerY);

      if (clickedElementInfo) {
        console.log(`🖱️ Clicked element: <${clickedElementInfo.tag.toLowerCase()} class="${clickedElementInfo.class}">`);
        console.log(`📝 Text content: "${clickedElementInfo.text}"`);
        console.log(`📍 Position: (${centerX}, ${centerY})`);
      } else {
        console.log('⚠️ No element found to click.');
      }
    }

    // Get the deeper child element handle
    const elementHandle = await page.evaluateHandle(el => {
      const nextSibling = el.parentElement.nextElementSibling;
      const firstChild = nextSibling && nextSibling.firstElementChild;
      const deepChild = firstChild && firstChild.firstElementChild;
      return deepChild && deepChild.firstElementChild ? deepChild.firstElementChild : null;
    }, h2);

    if (elementHandle) {
      await elementHandle.asElement().scrollIntoViewIfNeeded();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await elementHandle.asElement().click();
      console.log('🖱️ Clicked using element handle.');
    } else {
      console.log('⚠️ No element found to click.');
    }
  }



  // Wait for the page to load (you can adjust the selector or timeout as needed)
    await new Promise(resolve => setTimeout(resolve, 2000));

  // Get all buttons on the page
  const allButtons = await page.$$('button');

  // Log the text content of each button
  console.log(`🔎 Found ${allButtons.length} buttons on the page:`);
  for (let i = 0; i < allButtons.length; i++) {
    const btnText = await page.evaluate(el => el.textContent.trim(), allButtons[i]);
    console.log(`Button ${i + 1}: "${btnText}"`);
  }

  for (let i = 0; i < allButtons.length; i++) {
    const btnText = await page.evaluate(el => el.textContent.trim(), allButtons[i]);
    if (btnText === "·Cart") {
      await allButtons[i].click();
      console.log(`🖱️ Clicked Button ${i + 1}: "${btnText}"`);
      break; // Stop after clicking the desired button
    }
  }


  //i want you to get the whole uRL OF THE CURRENT PAGE AND SAVE IT TO A TEXT FILE CALLED current_url.txt
  const currentURL = page.url();
  await fs.writeFile('current_url.txt', currentURL);
  console.log(`💾 Current URL saved to current_url.txt: ${currentURL}`);

  //find all divs with class "page-header"
  const pageHeaderDivs = await page.$$('div.page-header');
  console.log(`🔎 Found ${pageHeaderDivs.length} divs with class "page-header".`);

//after page header is found get the next element after pageheader then within
//within that element they are buttons with text called "place bid"
//get all buttons and print there html
  if (pageHeaderDivs.length > 0) {
    const nextElementHtml = await page.evaluate(el => el.nextElementSibling ? el.nextElementSibling.outerHTML : null, pageHeaderDivs[0]);
    console.log('-----------------------------------');
    console.log('🚀 Next Sibling of First .page-header HTML:');
    console.log(nextElementHtml);
    console.log('-----------------------------------');
  }
  const pageHeader = pageHeaderDivs[0];
  if (pageHeader) {
    const nextSibling = await page.evaluateHandle(el => el.nextElementSibling, pageHeader);
    if (nextSibling) {
      const buttons = await nextSibling.$$('button');
      console.log(`🔎 Found ${buttons.length} buttons after .page-header:`);
      for (let i = 0; i < buttons.length; i++) {
        const btnClass = await page.evaluate(el => el.className, buttons[i]);
        if (btnClass.includes('hidden')) continue; // Skip hidden buttons
        const btnText = await page.evaluate(el => el.textContent.trim(), buttons[i]);
        if (btnText === "Place bid") {
          const btnHtml = await page.evaluate(el => el.outerHTML, buttons[i]);
          console.log(`Button ${i + 1} HTML: ${btnHtml}`);
        }
      }
    }
  }
  


  console.log('✨ Script completed! The browser will remain open.');