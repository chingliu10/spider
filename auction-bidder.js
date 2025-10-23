// ============================================
// FILE 1: auction-bidder.js (MODIFIED with Retries)
// ============================================

import puppeteer from 'puppeteer';
import fs from 'fs/promises';

(async () => {
    // -----------------------------------------------------------------
    // ⚙️ CONFIGURATION AND TIME MANAGEMENT
    // -----------------------------------------------------------------
    
    // ⭐ READ FROM ENVIRONMENT VARIABLES (for multi-instance support)
    const INSTANCE_ID = process.env.INSTANCE_ID || '1';
    const OK_BUTTON_OFFSET_SECONDS = process.env.OK_BUTTON_OFFSET_SECONDS 
        ? parseInt(process.env.OK_BUTTON_OFFSET_SECONDS) 
        : 5; // Default to 5 seconds
    const BID_VALUE = process.env.BID_AMOUNT || '1000000000000'; // Default 1 Trillion
    
    // ⭐ --- NEW: READ PRODUCT INDEX ---
    const PRODUCT_INDEX = process.env.PRODUCT_INDEX 
        ? parseInt(process.env.PRODUCT_INDEX) 
        : 0; // Default to the first product [0]
    
    // --- TARGET TIME: 10:44 AM EAT (10:44:00) ---
    const TARGET_HOUR = 16;      
    const TARGET_MINUTE = 0;    
    const TARGET_SECOND = 0;     

    // LATENCY ADJUSTMENT (To account for 1-4ms execution time)
    const LATENCY_OFFSET_MS = 50;
    
    // Calculate the absolute target time object
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), TARGET_HOUR, TARGET_MINUTE, TARGET_SECOND, 0);

    // Final execution timestamp (in milliseconds since epoch)
    const TARGET_BID_TIME_MS = targetDate.getTime() - LATENCY_OFFSET_MS; 
    
    // Time Thresholds (in milliseconds)
    const RELOAD_THRESHOLD_MS = 6 * 60 * 1000;  // Start frequent reloads at 6 minutes before
    const FINAL_RUN_THRESHOLD_MS = 5 * 60 * 1000;  // Start final execution at 5 minutes before
    const RELOAD_PAUSE_MS = 30000;              
    const SHORT_PAUSE_MS = 1000;                

    // Global coordinate storage 
    const PLACE_BID_SELECTOR = 'button ::-p-text(Place Bid)';


    // -----------------------------------------------------------------
    // 🛑 POST-4:50 PM CHECK AND FILE DELETION LOGIC (NEW)
    // -----------------------------------------------------------------
    const checkTimeAndDelete = async () => {
        const currentTime = new Date();
        // Set the 4:50 PM threshold for *today* in the current locale (EAT context assumed from TARGET_HOUR/MINUTE)
        const checkTime = new Date(
            currentTime.getFullYear(), 
            currentTime.getMonth(), 
            currentTime.getDate(), 
            16, // 4 PM
            50, // 50 minutes
            0, 
            0
        );

        if (currentTime.getTime() > checkTime.getTime()) {
            console.log(`[Instance ${INSTANCE_ID}] 🚨 Current time ${currentTime.toLocaleTimeString()} is past 4:50 PM EAT.`);
            
            const fileName = `instance${INSTANCE_ID}.js`;
            
            try {
                // Check if the file exists
                await fs.access(fileName); 
                
                console.log(`[Instance ${INSTANCE_ID}] 🗑️ Deleting content of file: ${fileName}...`);
                // Use writeFile to clear the content (effectively deleting the "edit")
                await fs.writeFile(fileName, ""); 
                
                console.log(`[Instance ${INSTANCE_ID}] ✅ File content cleared (edited to empty string). Shutting down.`);
                
            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.log(`[Instance ${INSTANCE_ID}] ℹ️ File ${fileName} does not exist. No action needed.`);
                } else {
                    console.error(`[Instance ${INSTANCE_ID}] ❌ Error accessing or clearing file ${fileName}: ${error.message}`);
                }
            }
            // Exit the script after the check and file operation
            process.exit(0); 
        } else {
            console.log(`[Instance ${INSTANCE_ID}] ⏳ Current time ${currentTime.toLocaleTimeString()} is before 4:50 PM. Proceeding with auction logic.`);
        }
    };

    // Execute the check and potential exit immediately
    await checkTimeAndDelete();
    
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
    // 🛠️ UTILITY FUNCTIONS (Delay and Retry)
    // -----------------------------------------------------------------
    
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    /**
     * Executes an operation with retries on network/timeout errors.
     */
    const retryOperation = async (operation, maxRetries = 10, initialDelayMs = 2000) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await operation();
                return result; // Success
            } catch (error) {
                console.error(`[Instance ${INSTANCE_ID}] ❌ Attempt ${attempt}/${maxRetries} failed: ${error.message.substring(0, 100)}...`);

                // Check for common network/timeout errors
                const isRetriable = 
                    error.message.includes('Timeout') || 
                    error.message.includes('net::ERR') ||
                    error.message.includes('Navigation failed');
                
                if (attempt === maxRetries || !isRetriable) {
                    console.error(`[Instance ${INSTANCE_ID}] 🛑 Max retries reached or non-retriable error. Aborting.`);
                    throw error; 
                }

                // Exponential backoff
                const waitTime = initialDelayMs * Math.pow(2, attempt - 1); 
                console.log(`[Instance ${INSTANCE_ID}] ⏳ Retrying in ${waitTime / 1000}s...`);
                await delay(waitTime);
            }
        }
    };


    // -----------------------------------------------------------------
    // 🔑 LOGIN SEQUENCE (RUNS ONCE, RETRIED ON FAILURE)
    // -----------------------------------------------------------------
    const loginSequence = async () => {
        console.log(`[Instance ${INSTANCE_ID}] 🌐 Navigating to TRA website...`);
        await page.goto('https://tanesw.tra.go.tz/', { waitUntil: 'networkidle2', timeout: 60000 }); 
        await page.setViewport({ width: 1366, height: 768 });

        console.log(`[Instance ${INSTANCE_ID}] 🔘 Clicking Login button...`);
        await page.waitForSelector('button[type="button"]', { hasText: "Login", timeout: 15000 });
        const loginBtn = page.locator('button[type="button"]', { hasText: "Login" });
        await loginBtn.click();
        await page.waitForSelector('input[title="ID"]', { timeout: 10000 });

        //const userID = '168733283';
        const userID = '142936062';
        const password = 'Happy@2025';
        console.log(`[Instance ${INSTANCE_ID}] ✍️ Filling credentials...`);
        await page.type('input[title="ID"]', userID);
        await page.type('input[type="password"]', password);

        console.log(`[Instance ${INSTANCE_ID}] 🚀 Submitting login form...`);
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }); 

        await page.waitForSelector('img', { visible: true, timeout: 60000 });
        console.log(`[Instance ${INSTANCE_ID}] ✅ Login successful. Waiting for bid time.`);
    };

    try {
        // Retry the entire login up to 5 times
        await retryOperation(loginSequence, 5, 5000); 
    } catch (error) {
        console.error(`[Instance ${INSTANCE_ID}] ❌ CRITICAL FAILURE: FAILED TO LOGIN after all retries. Shutting down.`);
        await browser.close();
        return;
    }

    // Load product URL outside the loop
    const data = await fs.readFile('products.json', 'utf-8');
    const products = JSON.parse(data);
    let url = products.url;

    // -----------------------------------------------------------------
    // 🎯 DYNAMIC MAPPING AND QUICK BID FUNCTION
    // -----------------------------------------------------------------
    const mapButtonsAndExecute = async (isFinalExecution = false) => {
        
        console.log(`[Instance ${INSTANCE_ID}] 🌐 Navigating to product URL: ${url}`);
        const navigationWait = isFinalExecution ? 'domcontentloaded' : 'networkidle2';
        // Note: page.goto is the most common place for network errors, 
        // which is why we wrap mapButtonsAndExecute in retryOperation later.
        await page.goto(url, { waitUntil: navigationWait, timeout: 30000 }); 
        
        let bidButtonElement;
        try {
            console.log(`[Instance ${INSTANCE_ID}] ⌛ Waiting for "Place Bid" button to appear...`);
            bidButtonElement = await page.waitForSelector(PLACE_BID_SELECTOR, { visible: true, timeout: 15000 }); 
            console.log(`[Instance ${INSTANCE_ID}] ✅ "Place Bid" button found.`);
        } catch (e) {
            console.error(`[Instance ${INSTANCE_ID}] ⚠️ Timeout waiting for "Place Bid" button:`, e.message);
            // Returning false signals a mapping failure, prompting a script-level retry
            return false;
        }

        const firstProduct = products.products[0];
        const coords = Object.values(firstProduct)[0];
        const btnX = coords.x;
        const btnY = coords.y;

        await page.evaluate((docX, docY) => {
            window.scrollTo(docX - window.innerWidth/2, docY - window.innerHeight/2);
        }, btnX, btnY);
        await delay(500);

        const placeBidButtonCoords = await page.evaluate(() => {
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
        });
        
        if (!placeBidButtonCoords || !placeBidButtonCoords.found) {
            console.error(`[Instance ${INSTANCE_ID}] ⚠️ Could not find "Place Bid" button after scrolling. Cannot proceed.`);
            return false;
        }

        if (isFinalExecution) {
            console.log(`\n[Instance ${INSTANCE_ID}] *** 🚀 FINAL EXECUTION SEQUENCE STARTING NOW ***`);
            console.log(`[Instance ${INSTANCE_ID}] 💰 Bid Amount: ${BID_VALUE}`);
            // ⭐ --- LOG THE PRODUCT INDEX ---
            console.log(`[Instance ${INSTANCE_ID}] 🎯 Targeting Product Index: ${PRODUCT_INDEX}`);
            console.log(`[Instance ${INSTANCE_ID}] ⏰ OK Click Offset: ${OK_BUTTON_OFFSET_SECONDS} seconds before target\n`);
            
            const allButtons = await page.$$('button');
            const placeBidButtons = [];

            for (const btn of allButtons) {
                const text = await page.evaluate(el => el.textContent.trim(), btn);
                if (text === "Place Bid") placeBidButtons.push(btn);
            }

            // --- ⭐ MODIFIED: Click Nth "Place Bid" button based on PRODUCT_INDEX ---
            if (placeBidButtons.length <= PRODUCT_INDEX) {
                 console.error(`[Instance ${INSTANCE_ID}] ❌ Error: Tried to find Product Index ${PRODUCT_INDEX}, but only found ${placeBidButtons.length} "Place Bid" buttons. Aborting.`);
                 return false;
            }
          
            console.log(`[Instance ${INSTANCE_ID}] ✅ Clicking "Place Bid" button at index [${PRODUCT_INDEX}]...`);
            // ⭐ --- THIS IS THE KEY CHANGE ---
            await placeBidButtons[PRODUCT_INDEX].click();

            await delay(1500); // Wait for modal animation/load

            // --- Click "Submit bid" within the modal ---
            const submitButtons = [];
            const btns = await page.$$('button');
            for (const btn of btns) {
                const text = await page.evaluate(el => el.textContent.trim(), btn);
                if (text === "Submit bid") submitButtons.push(btn);
            }

            if (submitButtons.length === 0) {
                console.error(`[Instance ${INSTANCE_ID}] ⚠️ Could not find initial "Submit bid" button!`);
                return false;
            }

            console.log(`[Instance ${INSTANCE_ID}] ✅ Clicking "Submit bid" button...`);
            await page.evaluate(btn => btn.click(), submitButtons[0]);

            // --- Fill Bid Value and Click Final "Submit" ---
            console.log(`[Instance ${INSTANCE_ID}] ⌛ Waiting for bid input field (Timeout 10s)...`);
            await page.waitForSelector('input[name="bidVal"]'); 
            await page.type('input[name="bidVal"]', BID_VALUE);

            console.log(`[Instance ${INSTANCE_ID}] 🔍 Looking for final "Submit" button...`);
            const alButtons = await page.$$('button');
            let submitBtnFinal = null;

            for (const btn of alButtons) {
                const text = await page.evaluate(el => el.textContent.trim(), btn);
                if (text === "Submit") {
                    submitBtnFinal = btn;
                    break;
                }
            }

            if (!submitBtnFinal) {
            console.error(`[Instance ${INSTANCE_ID}] ❌ Could not find final "Submit" button.`);
                return false;
            }

            console.log(`[Instance ${INSTANCE_ID}] ✅ Clicking final "Submit" button...`);
            // Use page.evaluate to ensure the click happens quickly in the page context
            await page.evaluate(btn => btn.click(), submitBtnFinal);

            // --- Handle Confirmation/Success Popup ("OK") ---
            console.log(`[Instance ${INSTANCE_ID}] ⏳ Waiting for 30 seconds for the popup to appear...`);
            await delay(30000);

            const okButtons = await page.$$('button');
            let okBtn = null;

            for (const btn of okButtons) {
                const text = await page.evaluate(el => el.textContent.trim(), btn);
                if (text === "OK") {
                    okBtn = btn;
                 break;
                }
            }

            if (!okBtn) {
                console.error(`[Instance ${INSTANCE_ID}] ❌ Could not find "OK" button. Continuing anyway.`);
            // Return true to allow the script to exit successfully
                return true; 
            }

            // ⭐ WAIT UNTIL PRECISE TIME BEFORE CLICKING OK BUTTON
            const okButtonClickTime = TARGET_BID_TIME_MS - (OK_BUTTON_OFFSET_SECONDS * 1000);
            const waitTimeForOkClick = okButtonClickTime - Date.now();
            
            if (waitTimeForOkClick > 0) {
               const clickTimeDate = new Date(okButtonClickTime);
                console.log(`\n[Instance ${INSTANCE_ID}] ⏰ OK button found! Now waiting to click at: ${clickTimeDate.toLocaleTimeString()}.${clickTimeDate.getMilliseconds()}`);
                console.log(`[Instance ${INSTANCE_ID}] ⏳ Waiting ${(waitTimeForOkClick / 1000).toFixed(2)} seconds until OK button click...`);
                await delay(waitTimeForOkClick);
           } else {
                console.log(`[Instance ${INSTANCE_ID}] ⚠️ Warning: Already past OK button click time! Clicking immediately...`);
            }

            const clickTimestamp = Date.now();
            await page.evaluate(btn => btn.click(), okBtn);
            console.log(
                `[Instance ${INSTANCE_ID}] ✅ Clicking "OK" button NOW! AT: ` + 
                new Date(clickTimestamp).toLocaleTimeString('en-US', { hour12: false }) + 
                '.' + 
             new Date(clickTimestamp).getMilliseconds() +
                ' EAT'
            );

            console.log(`[Instance ${INSTANCE_ID}] 🎉 Done handling popup.`);
            console.log(`[Instance ${INSTANCE_ID}] ⏳ Waiting for 30 seconds before closing...`);
            await delay(30000);
       }
        
        return true;
    }
       
   // -----------------------------------------------------------------
    // ⏰ TIMED RELOAD AND EXECUTION LOOP (NOW WITH RETRIES)
    // -----------------------------------------------------------------
    
    console.log(`\n[Instance ${INSTANCE_ID}] ⏳ Target Bid Time (Adjusted for latency): ${new Date(TARGET_BID_TIME_MS).toLocaleTimeString()} (${TARGET_BID_TIME_MS})`);
    // ⭐ --- LOG THE PRODUCT INDEX ---
    console.log(`[Instance ${INSTANCE_ID}] 🎯 Targeting Product Index: ${PRODUCT_INDEX}`);
    console.log(`[Instance ${INSTANCE_ID}] ⏰ OK Button will be clicked at: ${new Date(TARGET_BID_TIME_MS - (OK_BUTTON_OFFSET_SECONDS * 1000)).toLocaleTimeString()} (${OK_BUTTON_OFFSET_SECONDS} seconds before target)`);
    
    let timeRemainingMs = TARGET_BID_TIME_MS - Date.now();
    let initialMapDone = false;

    console.log(`[Instance ${INSTANCE_ID}] initial remaining time: ${timeRemainingMs} ms`);
    
    while (timeRemainingMs > FINAL_RUN_THRESHOLD_MS) {
        
        if (!initialMapDone || timeRemainingMs < RELOAD_THRESHOLD_MS) {
            
            console.log(`[Instance ${INSTANCE_ID}] [${new Date().toLocaleTimeString()}] ♻️ Time remaining: ${Math.ceil(timeRemainingMs / 1000)}s. ${initialMapDone ? "RELOADING PAGE..." : "INITIAL NAVIGATION & MAPPING..."}`);
            
            try {
                 // Retry navigation and mapping up to 3 times
                await retryOperation(async () => {
                    const success = await mapButtonsAndExecute(false);
                  if (!success) {
                        // If mapButtonsAndExecute returns false, it means a critical element wasn't found (not a network error), 
                        // so we treat it as a temporary failure and retry the page load.
                        throw new Error("Critical button mapping failure during pre-run.");
                    }
                }, 3, 2000); 

                initialMapDone = true;
            } catch (error) {
                console.error(`[Instance ${INSTANCE_ID}] 🛑 CRITICAL FAILURE: Failed to navigate and map buttons after all retries. Aborting.`);
                await browser.close();
                return;
            }
            
            if (timeRemainingMs > RELOAD_THRESHOLD_MS) {
                console.log(`[Instance ${INSTANCE_ID}] [${new Date().toLocaleTimeString()}] 🕰️ Done mapping. Waiting ${RELOAD_PAUSE_MS / 1000}s...`);
                await delay(RELOAD_PAUSE_MS);
            } else {
                await delay(SHORT_PAUSE_MS);
            }
            
        } else {
            console.log(`[Instance ${INSTANCE_ID}] [${new Date().toLocaleTimeString()}] 🕰️ Time remaining: ${Math.ceil(timeRemainingMs / 60000)} min. Waiting ${RELOAD_PAUSE_MS / 1000}s...`);
            await delay(RELOAD_PAUSE_MS);
        }
        
        timeRemainingMs = TARGET_BID_TIME_MS - Date.now();
    }
    
    // -----------------------------------------------------------------
    // ⚡️ FINAL EXECUTION - START IMMEDIATELY
    // -----------------------------------------------------------------
    
    console.log(`[Instance ${INSTANCE_ID}] [${new Date().toLocaleTimeString()}] ⚡️ Starting final execution sequence NOW!`);
    
    // The final execution should not retry, as time is critical.
    await mapButtonsAndExecute(true);

    await browser.close(); 
})();