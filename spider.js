import puppeteer from 'puppeteer';
import fs from 'fs/promises';

(async () => {
    // -----------------------------------------------------------------
    // ⚙️ CONFIGURATION AND TIME MANAGEMENT
    // -----------------------------------------------------------------
    
    // --- NEW TARGET TIME: 2:00 PM EAT (14:00:00) ---
    const TARGET_HOUR = 14;      
    const TARGET_MINUTE = 0;     
    const TARGET_SECOND = 0;     

    // LATENCY ADJUSTMENT (To account for 1-4ms execution time)
    const LATENCY_OFFSET_MS = 50; 
    
    // Calculate the absolute target time object
    const now = new Date();
    // Use the current date, but replace hour, minute, and second with target values
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), TARGET_HOUR, TARGET_MINUTE, TARGET_SECOND, 0);

    // Final execution timestamp (in milliseconds since epoch)
    const TARGET_BID_TIME_MS = targetDate.getTime() - LATENCY_OFFSET_MS; 
    
    // Time Thresholds (in milliseconds)
    const RELOAD_THRESHOLD_MS = 6 * 60 * 1000; 
    const FINAL_RUN_THRESHOLD_MS = 6 * 1000;  
    const RELOAD_PAUSE_MS = 30000;            
    const SHORT_PAUSE_MS = 1000;              

    // Global coordinate storage 
    let KNOWN_SUBMIT_X = null;
    let KNOWN_SUBMIT_Y = null;
    let KNOWN_OK_X = null;
    let KNOWN_OK_Y = null;
    const BID_VALUE = '100000000'; 
    const PLACE_BID_SELECTOR = 'button ::-p-text(Place Bid)';
    
    // --- BROWSER SETUP ---
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 100,
        devtools: false,
        defaultViewport: null,
        args: [
            '--start-maximized',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
        ]
    });

    const page = await browser.newPage();

    // -----------------------------------------------------------------
    // 🛠️ UTILITY FUNCTION FOR MANUAL BUTTON FINDING
    // -----------------------------------------------------------------
    /**
     * Finds a button by iterating over all buttons and checking their text content.
     * @param {puppeteer.Page} page 
     * @param {string} text The exact text content to search for.
     * @param {number} [timeout=15000] Timeout for the initial search.
     * @returns {Promise<puppeteer.ElementHandle | null>}
     */
    const findButtonByText = async (page, text, timeout = 15000) => {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const allButtons = await page.$$('button');
            for (const button of allButtons) {
                try {
                    // Use evaluate to get the actual text
                    const btnText = await page.evaluate(el => el.textContent.trim(), button);
                    if (btnText === text) {
                        return button; // Return the element handle
                    }
                } catch (e) {
                    // Element might be detached or stale, just continue
                    continue; 
                }
            }
            // Wait a short moment before checking again
            await new Promise(resolve => setTimeout(resolve, 50)); 
        }
        return null;
    };


    // -----------------------------------------------------------------
    // 🔑 LOGIN SEQUENCE (RUNS ONCE)
    // -----------------------------------------------------------------
    console.log('🌐 Navigating to TRA website...');
    await page.goto('https://tanesw.tra.go.tz/', { waitUntil: 'networkidle2' }); 
    await page.setViewport({ width: 1366, height: 768 });

    console.log('🔘 Clicking Login button...');
    const loginBtn = page.locator('button[type="button"]', { hasText: "Login" });
    await loginBtn.click();
    await page.waitForSelector('input[title="ID"]');

    const userID = '168733283';
    const password = 'Jesusmy01@';
    console.log('✍️ Filling credentials...');
    await page.type('input[title="ID"]', userID);
    await page.type('input[type="password"]', password);

    console.log('🚀 Submitting login form...');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' }); 

    try {
        await page.waitForSelector('img', { visible: true, timeout: 60000 });
        console.log('✅ Login successful. Waiting for bid time to navigate to product.');
    } catch (error) {
        console.error('⚠️ Timeout waiting for dashboard content:', error.message);
    }

    // Load product URL outside the loop
    const data = await fs.readFile('products.json', 'utf-8');
    const products = JSON.parse(data);
    let url = products.url;

    // -----------------------------------------------------------------
    // 🎯 DYNAMIC MAPPING AND QUICK BID FUNCTION
    // -----------------------------------------------------------------
    const mapButtonsAndExecute = async (isFinalExecution = false) => {
        
        // --- 1. Navigate to the product page ---
        console.log(`🌐 Navigating to product URL: ${url}`);
        
        const navigationWait = isFinalExecution ? 'networkidle2' : 'networkidle2';
        await page.goto(url, { waitUntil: navigationWait }); 
        
        // Get initial coordinates from JSON (used for scrolling)
        const firstProduct = products.products[0];
        const coords = Object.values(firstProduct)[0];
        const btnX = coords.x;
        const btnY = coords.y;

        // Scroll to the area 
        await page.evaluate((docX, docY) => {
            window.scrollTo(docX - window.innerWidth/2, docY - window.innerHeight/2);
        }, btnX, btnY);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // --- Initial Check/Map: Find the Place Bid button ---
        let bidButtonElement = await findButtonByText(page, "Place Bid");
        
        if (!bidButtonElement) {
            console.error('⚠️ Initial "Place Bid" button check failed. Cannot proceed.');
            return false;
        }

        // Get coordinates for mapping logic (used only if we haven't mapped Submit/OK yet)
        const placeBidButtonCoords = await page.evaluate(el => {
            const rect = el.getBoundingClientRect();
            return { 
                x: rect.x + window.pageXOffset + rect.width / 2, 
                y: rect.y + window.pageYOffset + rect.height / 2, 
                found: true 
            };
        }, bidButtonElement);
        
        if (!placeBidButtonCoords || !placeBidButtonCoords.found) {
            console.error('⚠️ Could not find "Place Bid" button coordinates. Cannot proceed.');
            return false;
        }

        if (isFinalExecution) {
            console.log('\n*** 🚀 FINAL EXECUTION SEQUENCE STARTING NOW ***');
            
            // --- STEP 1: Click "Place Bid" using the RELIABLE ELEMENT CLICK ---
            console.log(`1. Clicking "Place Bid" using element.click() for maximum reliability (using fresh element)...`);
            
            // 🛑 CRITICAL FIX: Re-fetch the element using the manual method
            const finalBidButtonElement = await findButtonByText(page, "Place Bid", 5000); // Reverted timeout to 5s for final run check
            
            if (!finalBidButtonElement) {
                console.error('FATAL: Could not find Place Bid button in final 5 seconds. Aborting.');
                return false;
            }
            
            await finalBidButtonElement.click(); 
            
            // Wait for the bid input modal to appear 
            console.log('⌛ Waiting for bid input field (Timeout 10s)...');
            await page.waitForSelector('input[name="bidVal"]', { visible: true, timeout: 10000 }); 
            
            // --- STEP 2: Fill the Bid Input (FAST: delay: 0) ---
            console.log(`2. Entering bid amount: ${BID_VALUE} (Delay: 0ms)`);
            await page.type('input[name="bidVal"]', BID_VALUE, { delay: 0 });

            if (!KNOWN_SUBMIT_X) {
                console.error('FATAL: Submit coordinates were lost or not mapped. Aborting bid.');
                return false;
            }

            // --- STEP 3: Click "Submit" using KNOWN coordinates (FAST) ---
            console.log(`3. Clicking Submit at (${KNOWN_SUBMIT_X.toFixed(2)}, ${KNOWN_SUBMIT_Y.toFixed(2)})`);
            await page.mouse.click(KNOWN_SUBMIT_X, KNOWN_SUBMIT_Y);
            
            await new Promise(resolve => setTimeout(resolve, 300));

            // --- STEP 4: Click "OK" using KNOWN coordinates (FAST) ---
            console.log(`4. 🔥 Clicking OK at (${KNOWN_OK_X.toFixed(2)}, ${KNOWN_OK_Y.toFixed(2)})`);
            await page.mouse.click(KNOWN_OK_X, KNOWN_OK_Y);
            
            console.log('\n🎉 QUICK BID SEQUENCE COMPLETED!');
            return true;
        } 
        
        // --- Mapping Logic (Only runs if coordinates haven't been successfully stored yet) ---
        if (KNOWN_SUBMIT_X === null) {
             console.log('Mapping Submit and OK buttons for the first time...');
            
             // Click Place Bid to open the modal and map buttons (Uses coordinates here for mapping)
             await page.mouse.click(placeBidButtonCoords.x, placeBidButtonCoords.y);
             await new Promise(resolve => setTimeout(resolve, SHORT_PAUSE_MS)); 

             // Find Submit Button (Guaranteed to be present after modal opens)
             let submitBox = await page.evaluate(() => {
                 // Find button with exact text 'Submit'
                 const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Submit');
                 if (btn) {
                     const rect = btn.getBoundingClientRect();
                     return { x: rect.x + window.pageXOffset + rect.width / 2, y: rect.y + window.pageYOffset + rect.height / 2 };
                 }
                 return null;
             });
            
             if (submitBox) {
                 // Click submit to reveal OK
                 await page.mouse.click(submitBox.x, submitBox.y);
                 await new Promise(resolve => setTimeout(resolve, 500)); 

                 // Find OK Button
                 let okBox = await page.evaluate(() => {
                     // Find button with exact text 'OK'
                     const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'OK');
                     if (btn) {
                         const rect = btn.getBoundingClientRect();
                         return { x: rect.x + window.pageXOffset + rect.width / 2, y: rect.y + window.pageYOffset + rect.height / 2 };
                     }
                     return null;
                 });
                
                 if (okBox) {
                     // STORE GLOBAL COORDINATES
                     KNOWN_SUBMIT_X = submitBox.x;
                     KNOWN_SUBMIT_Y = submitBox.y;
                     KNOWN_OK_X = okBox.x;
                     KNOWN_OK_Y = okBox.y;

                     await page.mouse.click(okBox.x, okBox.y); // Click OK to close the test modal
                     console.log('✅ Successfully mapped ALL critical button coordinates (Submit and OK).');
                 } else {
                     console.error('⚠️ Could not find OK button.');
                 }
             } else {
                  console.error('⚠️ Could not find Submit button.');
             }
         }
        
         return true;
    };
    
    // -----------------------------------------------------------------
    // ⏰ TIMED RELOAD AND EXECUTION LOOP
    // -----------------------------------------------------------------
    
    console.log(`\n⏳ Target Bid Time (Adjusted for latency): ${new Date(TARGET_BID_TIME_MS).toLocaleTimeString()} (${TARGET_BID_TIME_MS})`);
    
    let timeRemainingMs = TARGET_BID_TIME_MS - Date.now();
    let initialMapDone = false;
    
    while (timeRemainingMs > FINAL_RUN_THRESHOLD_MS) {
        
        if (!initialMapDone || timeRemainingMs < RELOAD_THRESHOLD_MS) {
            
            console.log(`[${new Date().toLocaleTimeString()}] ♻️ Time remaining: ${Math.ceil(timeRemainingMs / 1000)}s. ${initialMapDone ? "RELOADING PAGE..." : "INITIAL NAVIGATION & MAPPING..."}`);
            
            const success = await mapButtonsAndExecute(false);
            
            if (!success) {
                console.error('Critical failure during mapping/navigation. Aborting.');
                await browser.close();
                return;
            }
            initialMapDone = true;
            
            if (timeRemainingMs > RELOAD_THRESHOLD_MS) {
                console.log(`[${new Date().toLocaleTimeString()}] 🕰️ Done mapping. Waiting ${RELOAD_PAUSE_MS / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, RELOAD_PAUSE_MS));
            } else {
                await new Promise(resolve => setTimeout(resolve, SHORT_PAUSE_MS));
            }
            
        } else {
            console.log(`[${new Date().toLocaleTimeString()}] 🕰️ Time remaining: ${Math.ceil(timeRemainingMs / 60000)} min. Waiting ${RELOAD_PAUSE_MS / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, RELOAD_PAUSE_MS));
        }
        
        timeRemainingMs = TARGET_BID_TIME_MS - Date.now();
    }
    
    // -----------------------------------------------------------------
    // ⚡️ FINAL EXECUTION (Less than 6 seconds remaining)
    // -----------------------------------------------------------------
    
    const finalWaitTime = Math.max(0, TARGET_BID_TIME_MS - Date.now()); 
    
    if (finalWaitTime > 0) {
        console.log(`[${new Date().toLocaleTimeString()}] ⚡️ FINAL WAIT: Waiting ${finalWaitTime}ms for precise execution...`);
        await new Promise(resolve => setTimeout(resolve, finalWaitTime));
    }
    
    // Execute the final bid sequence
    await mapButtonsAndExecute(true);

    // -----------------------------------------------------------------
    await browser.close(); 
})();