import puppeteer from 'puppeteer';
import fs from 'fs/promises';

(async () => {
    // -----------------------------------------------------------------
    // ⚙️ CONFIGURATION AND TIME MANAGEMENT
    // -----------------------------------------------------------------
    
    // --- NEW TARGET TIME: 1:30 PM EAT (13:30:00) ---
    const TARGET_HOUR = 13;      
    const TARGET_MINUTE = 26;     
    const TARGET_SECOND = 0;     

    // LATENCY ADJUSTMENT 
    const LATENCY_OFFSET_MS = 50; 
    
    // Calculate the absolute target time object
    const now = new Date();
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
    // 🔑 LOGIN SEQUENCE (RUNS ONCE)
    // -----------------------------------------------------------------
    console.log('🌐 Navigating to TRA website...');
    await page.goto('https://tanesw.tra.go.tz/', { waitUntil: 'domcontentloaded' }); 
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
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' }); 

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
        
        // 🚨 CRITICAL FIX 1: Use 'networkidle0' for final execution page load to ensure all scripts are ready
        const navigationWait = isFinalExecution ? 'networkidle0' : 'domcontentloaded';
        await page.goto(url, { waitUntil: navigationWait }); 
        
        // Wait specifically for the "Place Bid" button to be visible
        let bidButtonElement;
        try {
            console.log('⌛ Waiting for "Place Bid" button to appear...');
            // CRITICAL FIX 2: Always re-find the element handle, especially in the final run
            bidButtonElement = await page.waitForSelector(PLACE_BID_SELECTOR, { visible: true, timeout: 15000 }); 
            console.log('✅ "Place Bid" button found.');
        } catch (e) {
            console.error('⚠️ Timeout waiting for "Place Bid" button:', e.message);
            return false;
        }

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

        // Get coordinates for mapping logic (even though the click won't use it in final run)
        const placeBidButtonCoords = await page.evaluate(() => {
            const button = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === "Place Bid");
            if (button) {
                const rect = button.getBoundingClientRect();
                return { 
                    x: rect.x + window.pageXOffset + rect.width / 2, 
                    y: rect.y + window.pageYOffset + rect.height / 2, 
                    found: true 
                };
            }
            return null;
        });
        
        if (!placeBidButtonCoords || !placeBidButtonCoords.found) {
            console.error('⚠️ Could not find "Place Bid" button coordinates. Cannot proceed.');
            return false;
        }

        if (isFinalExecution) {
            console.log('\n*** 🚀 FINAL EXECUTION SEQUENCE STARTING NOW ***');
            
            // --- STEP 1: Click "Place Bid" using the RELIABLE ELEMENT CLICK ---
            console.log(`1. Clicking "Place Bid" using element.click() for maximum reliability...`);
            await bidButtonElement.click(); 
            
            // Wait for the bid input modal to appear 
            console.log('⌛ Waiting for bid input field (Timeout 20s)...');
            // 🚨 CRITICAL FIX 3: Increase modal wait time again to 20 seconds as a final defense against server/network lag
            await page.waitForSelector('input[name="bidVal"]', { visible: true, timeout: 30000 }); 
            
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
            
            // Click Place Bid to open the modal and map buttons
            await page.mouse.click(placeBidButtonCoords.x, placeBidButtonCoords.y);
            await new Promise(resolve => setTimeout(resolve, SHORT_PAUSE_MS)); 

            // Find Submit Button 
            let submitBox = await page.evaluate(() => {
                const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().toLowerCase() === 'submit');
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
                    console.log('✅ Successfully mapped ALL critical button coordinates.');
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