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

  console.log('✨ Script completed! The browser will remain open.');