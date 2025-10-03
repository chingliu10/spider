import puppeteer from 'puppeteer';
import fs from 'fs/promises';

(async () => {
    // -----------------------------------------------------------------
    // ⚙️ CONFIGURATION AND TIME MANAGEMENT
    // -----------------------------------------------------------------
    
    // --- NEW TARGET TIME: 1:42 PM EAT (13:42:00) ---
    const TARGET_HOUR = 10;      
    const TARGET_MINUTE = 44;     
    const TARGET_SECOND = 0;     

    // LATENCY ADJUSTMENT (To account for 1-4ms execution time)
    const LATENCY_OFFSET_MS = 50;
    
    // ⭐ NEW: OK BUTTON CLICK TIMING (Click OK button X seconds BEFORE target time)
    const OK_BUTTON_OFFSET_SECONDS = 5; // Click OK at 9:04:55 (5 seconds before 9:05:00)
    
    // Calculate the absolute target time object
    const now = new Date();
    // Use the current date, but replace hour, minute, and second with target values
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), TARGET_HOUR, TARGET_MINUTE, TARGET_SECOND, 0);

    // Final execution timestamp (in milliseconds since epoch)
    const TARGET_BID_TIME_MS = targetDate.getTime() - LATENCY_OFFSET_MS; 
    
    // Time Thresholds (in milliseconds)
    const RELOAD_THRESHOLD_MS = 6 * 60 * 1000;  // Start frequent reloads at 6 minutes before
    const FINAL_RUN_THRESHOLD_MS = 5 * 60 * 1000;  // Start final execution at 5 minutes before
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
            
        // Use your reliable manual function to get all "Place Bid" buttons
        const allButtons = await page.$$('button');
        const placeBidButtons = [];

        for (const btn of allButtons) {
            const text = await page.evaluate(el => el.textContent.trim(), btn);
            if (text === "Place Bid") placeBidButtons.push(btn);
        }

        console.log('✅ Clicking the 2nd "Place Bid" button...');
        await placeBidButtons[1].click();


                // Simple delay function
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

        // Wait a bit for modal to render
        await delay(1500);

            // Find the Submit button inside the modal
        const submitButtons = [];
        const btns = await page.$$('button');
        for (const btn of btns) {
                    
                        // Evaluate the button's text content in the browser
                const text = await page.evaluate(el => el.textContent.trim(), btn);
                
                // 1. Log the text of every button examined
                console.log(`[Examining Button]: "${text}"`);

                if (text === "Submit bid") {
                    submitButtons.push(btn);
                    // 2. Log when a match is found
                    console.log('    -> ✅ MATCH: This is a "Submit bid" button.');
                }

        }

        if (submitButtons.length === 0) {
            console.error('⚠️ Could not find Submit button!');
            return false;
        }

        // Click Submit
        console.log('✅ Clicking Submit button...');
        // Instead of await submitButtons[0].click();
        await page.evaluate(btn => btn.click(), submitButtons[0]);


        // Use it like this:
        // await new Promise(resolve => setTimeout(resolve, 30000));
        // Wait for the bid input modal to appear 
        console.log('⌛ Waiting for bid input field (Timeout 10s)...');
        // Reverted to 10s timeout
        await page.waitForSelector('input[name="bidVal"]'); 
        // console.log('✍️ Filling Bid...');
        await page.type('input[name="bidVal"]', '1000000000000');

                // 3. Find and click the second "Submit" button
        console.log('🔍 Looking for final Submit button...');
        const alButtons = await page.$$('button');
        let submitBtnFinal = null;

        for (const btn of alButtons) {
            const text = await page.evaluate(el => el.textContent.trim(), btn);
            console.log(`[Examining Button]: "${text}"`);
            
            if (text === "Submit") {
                submitBtnFinal = btn;
                console.log('    -> ✅ MATCH: This is the final "Submit" button.');
                break;
            }
        }

        if (!submitBtnFinal) {
            console.error('❌ Could not find final "Submit" button.');
            return false;
        }

                
        // 4. Click the final Submit button
        console.log('✅ Clicking final Submit button...');
        await page.evaluate(btn => btn.click(), submitBtnFinal);

        // 5. Wait for 30 seconds
        console.log('⏳ Waiting for 30 seconds...');
        await new Promise(resolve => setTimeout(resolve, 30000));

        console.log('✅ Done!');

                // 6. Look for the OK button in the popup
        const okButtons = await page.$$('button');
        let okBtn = null;

        for (const btn of okButtons) {
            const text = await page.evaluate(el => el.textContent.trim(), btn);
            console.log(`[Examining Button]: "${text}"`);
            
            if (text === "OK") {
                okBtn = btn;
                console.log('    -> ✅ MATCH: Found "OK" button.');
                break;
            }
        }

                
        if (!okBtn) {
            console.error('❌ Could not find "OK" button.');
            return false;
        }

        // ⭐ NEW: WAIT UNTIL PRECISE TIME BEFORE CLICKING OK BUTTON
        const okButtonClickTime = TARGET_BID_TIME_MS - (OK_BUTTON_OFFSET_SECONDS * 1000);
        const waitTimeForOkClick = okButtonClickTime - Date.now();
       
        if (waitTimeForOkClick > 0) {
            const clickTimeDate = new Date(okButtonClickTime);
            console.log(`\n⏰ OK button found! Now waiting to click at: ${clickTimeDate.toLocaleTimeString()}.${clickTimeDate.getMilliseconds()}`);
            console.log(`⏳ Waiting ${(waitTimeForOkClick / 1000).toFixed(2)} seconds until OK button click...`);
            await new Promise(resolve => setTimeout(resolve, waitTimeForOkClick));
        } else {
            console.log('⚠️ Warning: Already past OK button click time! Clicking immediately...');
        }

        // 7. Click the OK button AT THE PRECISE TIME
        console.log('✅ Clicking "OK" button NOW!');
        await page.evaluate(btn => btn.click(), okBtn);
        // Capture the millisecond timestamp IMMEDIATELY before the click
        const clickTimestamp = Date.now();
         console.log(
             '✅ Clicking "OK" button NOW! AT: ' + 
             new Date(clickTimestamp).toLocaleTimeString('en-US', { hour12: false }) + 
             '.' + 
             new Date(clickTimestamp).getMilliseconds() +
            ' EAT'
         );

        console.log('🎉 Done handling popup.');
                // 5. Wait for 30 seconds
        console.log('⏳ Waiting for 30 seconds...');
        await new Promise(resolve => setTimeout(resolve, 30000));

        
    }
        
        
        return true;
    }
    
    // -----------------------------------------------------------------
    // ⏰ TIMED RELOAD AND EXECUTION LOOP
    // -----------------------------------------------------------------
    
    console.log(`\n⏳ Target Bid Time (Adjusted for latency): ${new Date(TARGET_BID_TIME_MS).toLocaleTimeString()} (${TARGET_BID_TIME_MS})`);
    console.log(`⏰ OK Button will be clicked at: ${new Date(TARGET_BID_TIME_MS - (OK_BUTTON_OFFSET_SECONDS * 1000)).toLocaleTimeString()} (${OK_BUTTON_OFFSET_SECONDS} seconds before target)`);
    
    let timeRemainingMs = TARGET_BID_TIME_MS - Date.now();
    let initialMapDone = false;

    console.log("remaining time")
    console.log(timeRemainingMs);
    console.log(FINAL_RUN_THRESHOLD_MS);
    
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
    // ⚡️ FINAL EXECUTION - START IMMEDIATELY
    // -----------------------------------------------------------------
    
    console.log(`[${new Date().toLocaleTimeString()}] ⚡️ Starting final execution sequence NOW!`);
    
    // Execute the final bid sequence immediately
    await mapButtonsAndExecute(true);

    // -----------------------------------------------------------------
    await browser.close(); 
})();