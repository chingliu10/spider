import puppeteer from 'puppeteer';
import fs from 'fs/promises';

(async () => { 
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 1000,
        devtools: false,
        defaultViewport: null,
        args: [
            '--start-maximized',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
        ]
    });

    const page = await browser.newPage();

    console.log('🌐 Navigating to TRA website...');
    await page.goto('https://tanesw.tra.go.tz/', { waitUntil: 'networkidle2' });

    console.log('📱 Setting viewport size...');
    await page.setViewport({ width: 1366, height: 768 });

    // 👉 Click the Login button
    console.log('🔘 Clicking Login button...');
    const loginBtn = page.locator('button[type="button"]', { hasText: "Login" });
    await loginBtn.click();

    // 👉 Wait for the ID input to appear
    console.log('⌛ Waiting for login form...');
    await page.waitForSelector('input[title="ID"]');

    // 👉 Fill ID (fast human-like typing ≈1.4s for all digits)
    const userID = '168733283';
    console.log('✍️ Filling ID...');
    await page.type('input[title="ID"]', userID); 

    const password = 'Jesusmy01@';
    console.log('🔑 Filling Password...');
    await page.type('input[type="password"]', password);

    // 👉 Click the Login (submit) button inside popup
    console.log('🚀 Submitting login form...');
    await page.click('button[type="submit"]');


    // ... [Existing successful login code] ...

    // 👉 Wait for the first image element (img) to load
    console.log('🖼️ Waiting for the first image element to load...');
    try {
        // Wait for the first 'img' element on the page to be visible.
        await page.waitForSelector('img', { 
            visible: true, 
            timeout: 60000 
        });
        console.log('✅ First image loaded. Proceeding with product navigation.');

    } catch (error) {
        console.error('⚠️ Timeout waiting for image to load:', error.message);
    }

    // ----------------------------------------------------------------------
    // NOW WE PROCEED WITH LOADING THE PRODUCT URL
    // ----------------------------------------------------------------------
    // 👉 Load product URL from products.json
    const data = await fs.readFile('products.json', 'utf-8');
    const products = JSON.parse(data);

    console.log(products.url);
    let url = products.url;
    console.log(`🌐 Navigating to product URL: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Deal with only product1 (first product)
    const firstProduct = products.products[0];
    const coords = Object.values(firstProduct)[0];
    const btnX = coords.x;
    const btnY = coords.y;

    console.log(`🎯 Looking for "Place Bid" button near coordinates: (${btnX}, ${btnY})`);

    // Scroll to the area first
    await page.evaluate((docX, docY) => {
        window.scrollTo(docX - window.innerWidth/2, docY - window.innerHeight/2);
    }, btnX, btnY);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Find the "Place Bid" button
    const placeBidButton = await page.evaluate((targetX, targetY) => {
        const allButtons = document.querySelectorAll('button');
        let closestButton = null;
        let closestDistance = Infinity;
        
        for (const button of allButtons) {
            const text = button.textContent.trim();
            if (text === "Place Bid") {
                const rect = button.getBoundingClientRect();
                const buttonX = rect.x + rect.width / 2;
                const buttonY = rect.y + rect.height / 2;
                
                const distance = Math.sqrt(
                    Math.pow(buttonX - (targetX - window.pageXOffset), 2) + 
                    Math.pow(buttonY - (targetY - window.pageYOffset), 2)
                );
                
                if (distance < closestDistance && distance < 200) {
                    closestDistance = distance;
                    closestButton = {
                        x: buttonX,
                        y: buttonY,
                        distance: distance
                    };
                }
            }
        }
        
        return closestButton;
    }, btnX, btnY);

    if (placeBidButton) {
        
        console.log(`✅ Found "Place Bid" button at (${placeBidButton.x}, ${placeBidButton.y}), distance: ${placeBidButton.distance.toFixed(2)}px`);
        await page.mouse.click(placeBidButton.x, placeBidButton.y);

        // Wait for popup to appear
        console.log('⌛ Waiting for bid popup to load...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Find and click the "Submit bid" button
        console.log('🔍 Looking for "Submit bid" button...');


        if (placeBidButton) {
            console.log(`✅ Found "Place Bid" button at (${placeBidButton.x}, ${placeBidButton.y})`);
            await page.mouse.click(placeBidButton.x, placeBidButton.y);

            // Wait for popup
            await new Promise(resolve => setTimeout(resolve, 500));


            const submitButton = await page.$('button.button-contained.bg-gray.border-gray.text-white');

            if (submitButton) {
                console.log('✅ Found "Submit bid" button, clicking...');
                await submitButton.click();

                // Wait for bid input
                await page.waitForSelector('input[name="bidVal"]', { visible: true });
                await page.type('input[name="bidVal"]', '100000000', { delay: 0 });

                //find all buttons and they is button caled Submit bid click that button
            }
        }
    }


    // -----------------------------------------------------------------
    // GLOBAL VARIABLE DECLARATIONS
    // The variables are declared here to be accessible throughout the script.
    let submitButtonBox = null;
    let okButtonBox = null;
    // -----------------------------------------------------------------


    // 👉 Look for "Submit" button and record its position
    console.log('🔍 Looking for "Submit" button...');
    submitButtonBox = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const btn of buttons) {
            if (btn.textContent.trim().toLowerCase() === 'submit') {
                const rect = btn.getBoundingClientRect();
                return {
                    x: rect.x + window.pageXOffset + rect.width / 2,
                    y: rect.y + window.pageYOffset + rect.height / 2,
                    width: rect.width,
                    height: rect.height,
                    text: btn.textContent.trim()
                };
            }
        }
        return null;
    });

    if (submitButtonBox) {
        console.log(`✅ Found "Submit" button at (${submitButtonBox.x}, ${submitButtonBox.y})`);
        console.log(`📦 Size: ${submitButtonBox.width}x${submitButtonBox.height}`);
        console.log(`📝 Text: "${submitButtonBox.text}"`);

        // Optionally click it
        await page.mouse.click(submitButtonBox.x, submitButtonBox.y);

        // -----------------------------------------------------------------
        // WAITING FOR POP-UP TO RENDER BEFORE SEARCHING FOR 'OK'
        // CRITICAL: This short pause ensures the popup is in the DOM before we search.
        console.log('⌛ Waiting for "OK" confirmation pop-up to render...');
        await new Promise(resolve => setTimeout(resolve, 500)); 
        // -----------------------------------------------------------------

        // 💥 REVISED CODE TO FIND AND STORE "OK" BUTTON COORDINATES 💥
        okButtonBox = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            
            for (const btn of buttons) {
                // Check if the button's visible text is exactly "OK"
                if (btn.textContent.trim() === 'OK') {
                    const rect = btn.getBoundingClientRect();
                    // Return the absolute center coordinates (x, y) relative to the document
                    return {
                        x: rect.x + window.pageXOffset + rect.width / 2,
                        y: rect.y + window.pageYOffset + rect.height / 2,
                        text: btn.textContent.trim()
                    };
                }
            }
            return null; // Return null if not found
        });

        if (okButtonBox) {
            console.log(`✅ Found "OK" button at (${okButtonBox.x.toFixed(2)}, ${okButtonBox.y.toFixed(2)})`);
            
            // 🔥 ACTION: Click the OK button at the calculated position
            console.log('🔥 Clicking the OK button position...');
            await page.mouse.click(okButtonBox.x, okButtonBox.y);

            console.log('👋 "OK" button clicked. Proceeding...');
            
        } else {
            console.error('⚠️ "OK" button not found within the search time.');
        }

        // Optional: Add a short pause to allow the pop-up to close or the next action to register
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // -----------------------------------------------------------------
    } else {
        console.log('⚠️ No "Submit" button found.');
    }
})();