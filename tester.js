import puppeteer from 'puppeteer';
import fs from 'fs/promises';

(async () => {
    // -----------------------------------------------------------------
    // ⚙️ CONFIGURATION AND TIME MANAGEMENT
    // -----------------------------------------------------------------
    
    // --- NEW TARGET TIME: 1:42 PM EAT (13:42:00) ---
    const TARGET_HOUR = 19;      
    const TARGET_MINUTE = 54;     
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
    // 🔑 LOGIN SEQUENCE (RUNS ONCE)
    // -----------------------------------------------------------------
    console.log('🌐 Navigating to TRA website...');
    // Reverted to your original 'networkidle2' wait (as in the code you provided)
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
    // Reverted to your original 'networkidle2' wait (as in the code you provided)
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
        // Reverted to your original 'networkidle2' wait (as in the code you provided)
        const navigationWait = isFinalExecution ? 'networkidle2' : 'networkidle2';
        await page.goto(url, { waitUntil: navigationWait }); 
        
        // Wait specifically for the "Place Bid" button to be visible
        let bidButtonElement;
        try {
            console.log('⌛ Waiting for "Place Bid" button to appear...');
            // This retrieves the element handle for the mapping/initial stage
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

        // Get coordinates for mapping logic (only needed for the mouse click in the mapping section)
        const placeBidButtonCoords = await page.evaluate((targetX, targetY) => {
            const allButtons = document.querySelectorAll('button');
            for (const button of allButtons) {
                if (button.textContent.trim() === "Place Bid") {
                    const rect = button.getBoundingClientRect();
                    return { 
                        x: rect.x + window.pageXOffset + rect.width / 2, 
                        y: rect.y + window.pageYOffset + rect.height / 2, 
                        found: true 
                    };
                }
            }
            return null;
        }, btnX, btnY);
        
        if (!placeBidButtonCoords || !placeBidButtonCoords.found) {
            console.error('⚠️ Could not find "Place Bid" button after scrolling. Cannot proceed.');
            return false;
        }

        if (isFinalExecution) {
            console.log('\n*** 🚀 FINAL EXECUTION SEQUENCE STARTING NOW ***');
            
            // --- STEP 1: Click "Place Bid" using the RELIABLE ELEMENT CLICK ---
            console.log(`1. Clicking "Place Bid" using element.click() for maximum reliability...`);
            
            // 🛑 FIX: Re-fetch the element immediately before the click to ensure it's not stale 
            const finalBidButtonElement = await page.waitForSelector(PLACE_BID_SELECTOR, { visible: true, timeout: 5000 });
            await finalBidButtonElement.click(); 
            
            // Wait for the bid input modal to appear 
            console.log('⌛ Waiting for bid input field (Timeout 10s)...');
            // Reverted to 10s timeout
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