import puppeteer from 'puppeteer';

// Add "type": "module" to your package.json file to use this syntax.
import fs from 'fs/promises';

(async () => { 
  const browser = await puppeteer.launch({
    headless: false,        // Show browser
    slowMo: 1000,           // Slow down actions (1s per step)
    devtools: false,        // Open DevTools automatically
    defaultViewport: null,  // Use full screen
    args: [
      '--start-maximized',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });

  const page = await browser.newPage();

  console.log('🌐 Navigating to TRA website...');
  await page.goto('https://tanesw.tra.go.tz/', { waitUntil: 'networkidle0' }); // ✅ wait until fully loaded

  console.log('📱 Setting viewport size...');
  await page.setViewport({ width: 1366, height: 768 });

  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('✨ Script completed! The browser will remain open.');
  console.log('⌛ Finding all <h2> elements...');

  // 👉 Click the Login button to open popup
  console.log('🔘 Clicking Login button...');
 // Go to TRA site and wait for full load
await page.goto('https://tanesw.tra.go.tz/', { waitUntil: 'networkidle0' });

// Wait for the Login button to be visible
await page.waitForSelector('button[type="button"]', { visible: true });

// Click the Login button
await page.click('button[type="button"]');


  // 👉 Wait for the ID input to appear
  console.log('⌛ Waiting for login form...');
  await page.waitForSelector('input[title="ID"]', { visible: true }); // ✅ wait for input

  // 👉 Fill ID
  console.log('✍️ Typing ID...');
 // 👉 Fill ID (Pasting the content)
// 👉 Fill ID (Slightly slower but more reliable)
console.log('✍️ Typing ID...');
await page.focus('input[title="ID"]');
await page.keyboard.type('168733283');

// 👉 Fill Password
console.log('🔑 Typing Password...');
await page.focus('input[type="password"]');
await page.keyboard.type('Jesusmy01@');

  // 👉 Click the Login (submit) button inside popup
  console.log('🚀 Submitting login form...');
  await page.waitForSelector('button[type="submit"]', { visible: true }); // ✅ wait for submit button
  await page.click('button[type="submit"]');

  // Wait for 30 seconds for the page to load
  console.log('⌛ Waiting for 30 seconds...');
  await new Promise(resolve => setTimeout(resolve, 30000));

  // ... (Your existing login code continues unchanged)

  console.log('⌛ Waiting for "Auction" button to appear...');
  const h2Elements = await page.$$('h2');

  console.log(`✅ Found ${h2Elements.length} <h2> elements.`);

  if (h2Elements.length > 2) {
    const h2 = h2Elements[2]; // third element (index 2)

    const parentHtml = await page.evaluate(el => el.parentElement.outerHTML, h2);

    console.log('-----------------------------------');
    console.log('🚀 Parent Element HTML:');
    console.log(parentHtml);
    console.log('-----------------------------------');

    const nextSiblingHtml = await page.evaluate(el => el.parentElement.nextElementSibling?.outerHTML, h2);

    console.log('-----------------------------------');
    console.log('🚀 Parent\'s Next Sibling HTML:');
    console.log(nextSiblingHtml);
    console.log('-----------------------------------');

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

      await new Promise(resolve => setTimeout(resolve, 1000));

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

      await page.mouse.click(centerX, centerY);

      if (clickedElementInfo) {
        console.log(`🖱️ Clicked element: <${clickedElementInfo.tag.toLowerCase()} class="${clickedElementInfo.class}">`);
        console.log(`📝 Text content: "${clickedElementInfo.text}"`);
        console.log(`📍 Position: (${centerX}, ${centerY})`);
      } else {
        console.log('⚠️ No element found to click.');
      }
    }

    const elementHandle = await page.evaluateHandle(el => {
      const nextSibling = el.parentElement.nextElementSibling;
      const firstChild = nextSibling && nextSibling.firstElementChild;
      const deepChild = firstChild && firstChild.firstElementChild;
      return deepChild && deepChild.firstElementChild ? deepChild.firstElementChild : null;
    }, h2);

    if (elementHandle) {
      await elementHandle.asElement().scrollIntoViewIfNeeded();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await elementHandle.asElement().click();
      console.log('🖱️ Clicked using element handle.');
    } else {
      console.log('⚠️ No element found to click.');
    }
  }

  await new Promise(resolve => setTimeout(resolve, 2000));

  const allButtons = await page.$$('button');

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
      break;
    }
  }

  const currentURL = page.url();
  await fs.writeFile('current_url.txt', currentURL);
  console.log(`💾 Current URL saved to current_url.txt: ${currentURL}`);

  const pageHeaderDivs = await page.$$('div.page-header');
  console.log(`🔎 Found ${pageHeaderDivs.length} divs with class "page-header".`);

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
        if (btnClass.includes('hidden')) continue;
        const btnText = await page.evaluate(el => el.textContent.trim(), buttons[i]);
        if (btnText === "Place Bid") {
          const btnHtml = await page.evaluate(el => el.outerHTML, buttons[i]);
          console.log(`Button ${i + 1} HTML: ${btnHtml}`);
        }
      }
    }
  }

  if (pageHeader) {
    const nextSibling = await page.evaluateHandle(el => el.nextElementSibling, pageHeader);
    const placeBidButtons = await nextSibling.$$('button:not(.hidden)');
    const visiblePlaceBidButtons = [];
    for (const button of placeBidButtons) {
      const text = await button.evaluate(el => el.textContent.trim());
      if (text === "Place Bid") {
        visiblePlaceBidButtons.push(button);
      }
    }

    if (visiblePlaceBidButtons.length > 0) {
      const randomIndex = Math.floor(Math.random() * visiblePlaceBidButtons.length);
      console.log(`🖱️ Randomly clicking "Place Bid" button at index ${randomIndex}...`);
      await visiblePlaceBidButtons[randomIndex].click();
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  console.log('📍 Scrolling to top for consistent coordinates...');
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(resolve => setTimeout(resolve, 2000));

  const products = [];
  const username = '115832220';
  const password = 'Tesha2020**';
  const url = page.url();

  if (pageHeader) {
    const nextSibling = await page.evaluateHandle(el => el.nextElementSibling, pageHeader);
    if (nextSibling) {
      const buttons = await nextSibling.$$('button');
      let productCount = 1;
      for (let i = 0; i < buttons.length; i++) {
        const btnClass = await page.evaluate(el => el.className, buttons[i]);
        if (btnClass.includes('hidden')) continue;
        const btnText = await page.evaluate(el => el.textContent.trim(), buttons[i]);
        if (btnText === "Place Bid") {
          const btnBox = await page.evaluate(el => {
            const rect = el.getBoundingClientRect();
            return { 
              x: rect.x + window.pageXOffset,
              y: rect.y + window.pageYOffset
            };
          }, buttons[i]);
          products.push({
            [`product${productCount}`]: {
              x: btnBox.x,
              y: btnBox.y
            }
          });
          productCount++;
        }
      }
    }
  }

  const output = {
    url,
    username,
    password,
    products
  };

  console.log("output*********************")
  console.log(output)
  console.log("output*********************")
  await fs.writeFile('products.json', JSON.stringify(output, null, 2));
  console.log('💾 Saved product positions to products.json');

  await browser.close();
  console.log('✨ Script completed! The browser has been closed.');

})();
