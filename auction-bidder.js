// ============================================
// FILE 1: auction-bidder.js (SYNCHRONIZED VERSION)
// ============================================

import puppeteer from 'puppeteer';
import fs from 'fs/promises';

(async () => {
    // -----------------------------------------------------------------
    // ⚙️ CONFIGURATION AND TIME MANAGEMENT
    // -----------------------------------------------------------------
    
    const INSTANCE_ID = process.env.INSTANCE_ID || '1';
    const OK_BUTTON_OFFSET_SECONDS = process.env.OK_BUTTON_OFFSET_SECONDS 
        ? parseInt(process.env.OK_BUTTON_OFFSET_SECONDS) 
        : 5;
    const BID_VALUE = process.env.BID_AMOUNT || '1000000000000';
    const PRODUCT_INDEX = process.env.PRODUCT_INDEX 
        ? parseInt(process.env.PRODUCT_INDEX) 
        : 0;
    
    const TOTAL_INSTANCES = process.env.TOTAL_INSTANCES 
        ? parseInt(process.env.TOTAL_INSTANCES) 
        : 12;
    
    const TARGET_HOUR = 16;      
    const TARGET_MINUTE = 0;    
    const TARGET_SECOND = 0;     
    const LATENCY_OFFSET_MS = 50;
    
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), TARGET_HOUR, TARGET_MINUTE, TARGET_SECOND, 0);
    const TARGET_BID_TIME_MS = targetDate.getTime() - LATENCY_OFFSET_MS; 
    
    const PLACE_BID_SELECTOR = 'button ::-p-text(Place Bid)';
    const SYNC_DIR = './sync_state';
    const ALIVE_INSTANCES_FILE = `${SYNC_DIR}/alive_instances.json`;

    // -----------------------------------------------------------------
    // 🛠️ UTILITY FUNCTIONS (MUST BE DEFINED FIRST)
    // -----------------------------------------------------------------
    
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    const retryOperation = async (operation, maxRetries = 10, initialDelayMs = 2000) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await operation();
                return result;
            } catch (error) {
                console.error(`[Instance ${INSTANCE_ID}] ❌ Attempt ${attempt}/${maxRetries} failed: ${error.message.substring(0, 100)}...`);

                const isRetriable = 
                    error.message.includes('Timeout') || 
                    error.message.includes('net::ERR') ||
                    error.message.includes('Navigation failed');
                
                if (attempt === maxRetries || !isRetriable) {
                    console.error(`[Instance ${INSTANCE_ID}] 🛑 Max retries reached or non-retriable error. Aborting.`);
                    throw error; 
                }

                const waitTime = initialDelayMs * Math.pow(2, attempt - 1); 
                console.log(`[Instance ${INSTANCE_ID}] ⏳ Retrying in ${waitTime / 1000}s...`);
                await delay(waitTime);
            }
        }
    };

    // -----------------------------------------------------------------
    // 🔄 DYNAMIC INSTANCE TRACKING
    // -----------------------------------------------------------------
    
    const ensureSyncDir = async () => {
        try {
            await fs.access(SYNC_DIR);
        } catch {
            await fs.mkdir(SYNC_DIR, { recursive: true });
        }
    };

    const registerInstance = async () => {
        await ensureSyncDir();
        let aliveInstances = {};
        
        try {
            const data = await fs.readFile(ALIVE_INSTANCES_FILE, 'utf-8');
            aliveInstances = JSON.parse(data);
        } catch (error) {
            // File doesn't exist yet, start fresh
        }
        
        aliveInstances[INSTANCE_ID] = {
            status: 'alive',
            lastSeen: new Date().toISOString()
        };
        
        await fs.writeFile(ALIVE_INSTANCES_FILE, JSON.stringify(aliveInstances, null, 2));
        console.log(`[Instance ${INSTANCE_ID}] ✅ Registered as ALIVE`);
    };

    const markInstanceDead = async () => {
        await ensureSyncDir();
        let aliveInstances = {};
        
        try {
            const data = await fs.readFile(ALIVE_INSTANCES_FILE, 'utf-8');
            aliveInstances = JSON.parse(data);
        } catch (error) {
            return;
        }
        
        if (aliveInstances[INSTANCE_ID]) {
            aliveInstances[INSTANCE_ID].status = 'dead';
            aliveInstances[INSTANCE_ID].diedAt = new Date().toISOString();
            await fs.writeFile(ALIVE_INSTANCES_FILE, JSON.stringify(aliveInstances, null, 2));
            console.log(`[Instance ${INSTANCE_ID}] 💀 Marked as DEAD`);
        }
    };

    const getAliveInstanceCount = async () => {
        try {
            const data = await fs.readFile(ALIVE_INSTANCES_FILE, 'utf-8');
            const aliveInstances = JSON.parse(data);
            const alive = Object.values(aliveInstances).filter(inst => inst.status === 'alive').length;
            return alive;
        } catch (error) {
            return 0;
        }
    };

    const markStepComplete = async (stepName) => {
        await ensureSyncDir();
        const filename = `${SYNC_DIR}/instance_${INSTANCE_ID}_${stepName}.done`;
        await fs.writeFile(filename, new Date().toISOString());
        console.log(`[Instance ${INSTANCE_ID}] ✅ Marked step "${stepName}" as complete`);
    };

    const waitForAllInstances = async (stepName, maxRetries = 3, currentRetry = 1) => {
        await ensureSyncDir();
        
        const aliveCount = await getAliveInstanceCount();
        
        if (aliveCount === 0) {
            console.log(`[Instance ${INSTANCE_ID}] ⚠️ No alive instances tracked yet. Proceeding...`);
            return true;
        }
        
        console.log(`[Instance ${INSTANCE_ID}] ⏳ Waiting for ${aliveCount} ALIVE instances to complete step "${stepName}" (Attempt ${currentRetry}/${maxRetries})...`);
        
        const checkInterval = 300;
        const maxWaitTime = 20 * 1000; // 20 seconds
        let elapsed = 0;
        
        while (elapsed < maxWaitTime) {
            try {
                const files = await fs.readdir(SYNC_DIR);
                const completedCount = files.filter(f => f.endsWith(`_${stepName}.done`)).length;
                
                console.log(`[Instance ${INSTANCE_ID}] 📊 Step "${stepName}": ${completedCount}/${aliveCount} alive instances completed`);
                
                if (completedCount >= aliveCount) {
                    console.log(`[Instance ${INSTANCE_ID}] ✅ All ${aliveCount} alive instances completed "${stepName}". Proceeding...`);
                    return true;
                }
            } catch (error) {
                console.error(`[Instance ${INSTANCE_ID}] ⚠️ Error checking sync status:`, error.message);
            }
            
            await delay(checkInterval);
            elapsed += checkInterval;
        }
        
        // Timeout reached
        if (currentRetry < maxRetries) {
            console.log(`[Instance ${INSTANCE_ID}] ⚠️ Timeout on attempt ${currentRetry}. Retrying...`);
            return await waitForAllInstances(stepName, maxRetries, currentRetry + 1);
        } else {
            const files = await fs.readdir(SYNC_DIR);
            const completedCount = files.filter(f => f.endsWith(`_${stepName}.done`)).length;
            console.log(`[Instance ${INSTANCE_ID}] 🚀 Max retries reached. Proceeding with ${completedCount} instances that completed.`);
            return true;
        }
    };

    // -----------------------------------------------------------------
    // 🛑 POST-4:50 PM CHECK AND FILE DELETION LOGIC
    // -----------------------------------------------------------------
    const checkTimeAndDelete = async () => {
        const currentTime = new Date();
        const checkTime = new Date(
            currentTime.getFullYear(), 
            currentTime.getMonth(), 
            currentTime.getDate(), 
            16, 
            50, 
            0, 
            0
        );

        if (currentTime.getTime() > checkTime.getTime()) {
            console.log(`[Instance ${INSTANCE_ID}] 🚨 Current time ${currentTime.toLocaleTimeString()} is past 4:50 PM EAT.`);
            
            const fileName = `instance${INSTANCE_ID}.js`;
            
            try {
                await fs.access(fileName); 
                console.log(`[Instance ${INSTANCE_ID}] 🗑️ Deleting content of file: ${fileName}...`);
                await fs.writeFile(fileName, ""); 
                console.log(`[Instance ${INSTANCE_ID}] ✅ File content cleared. Shutting down.`);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.log(`[Instance ${INSTANCE_ID}] ℹ️ File ${fileName} does not exist. No action needed.`);
                } else {
                    console.error(`[Instance ${INSTANCE_ID}] ❌ Error accessing or clearing file ${fileName}: ${error.message}`);
                }
            }
            process.exit(0); 
        } else {
            console.log(`[Instance ${INSTANCE_ID}] ⏳ Current time ${currentTime.toLocaleTimeString()} is before 4:50 PM. Proceeding with auction logic.`);
        }
    };

    await checkTimeAndDelete();
    await markStepComplete('step1_time_check');
    await waitForAllInstances('step1_time_check');
    
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
    await markStepComplete('step2_browser_setup');
    await waitForAllInstances('step2_browser_setup');

    // -----------------------------------------------------------------
    // 🔑 LOGIN SEQUENCE
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

        const userID = '142936062';
        const password = 'Happy@2025';
        console.log(`[Instance ${INSTANCE_ID}] ✍️ Filling credentials...`);
        await page.type('input[title="ID"]', userID);
        await page.type('input[type="password"]', password);

        console.log(`[Instance ${INSTANCE_ID}] 🚀 Submitting login form...`);
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }); 

        await page.waitForSelector('img', { visible: true, timeout: 60000 });
        console.log(`[Instance ${INSTANCE_ID}] ✅ Login successful.`);
    };

    try {
        await retryOperation(loginSequence, 5, 5000); 
        await markStepComplete('step3_login');
        await waitForAllInstances('step3_login');
    } catch (error) {
        console.error(`[Instance ${INSTANCE_ID}] ❌ CRITICAL FAILURE: FAILED TO LOGIN after all retries. Shutting down.`);
        await browser.close();
        return;
    }

    const data = await fs.readFile('products.json', 'utf-8');
    const products = JSON.parse(data);
    let url = products.url;
    await markStepComplete('step4_load_products');
    await waitForAllInstances('step4_load_products');

    // -----------------------------------------------------------------
    // 🎯 NAVIGATION AND BUTTON MAPPING
    // -----------------------------------------------------------------
    
    console.log(`[Instance ${INSTANCE_ID}] 🌐 Navigating to product URL: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await markStepComplete('step5_navigate_product');
    await waitForAllInstances('step5_navigate_product');
    
    let bidButtonElement;
    try {
        console.log(`[Instance ${INSTANCE_ID}] ⌛ Waiting for "Place Bid" button to appear...`);
        bidButtonElement = await page.waitForSelector(PLACE_BID_SELECTOR, { visible: true, timeout: 15000 }); 
        console.log(`[Instance ${INSTANCE_ID}] ✅ "Place Bid" button found.`);
    } catch (e) {
        console.error(`[Instance ${INSTANCE_ID}] ⚠️ Timeout waiting for "Place Bid" button:`, e.message);
        await browser.close();
        return;
    }
    await markStepComplete('step6_find_place_bid_button');
    await waitForAllInstances('step6_find_place_bid_button');

    const firstProduct = products.products[0];
    const coords = Object.values(firstProduct)[0];
    const btnX = coords.x;
    const btnY = coords.y;

    await page.evaluate((docX, docY) => {
        window.scrollTo(docX - window.innerWidth/2, docY - window.innerHeight/2);
    }, btnX, btnY);
    await delay(500);
    await markStepComplete('step7_scroll_to_button');
    await waitForAllInstances('step7_scroll_to_button');

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
        await browser.close();
        return;
    }
    await markStepComplete('step8_verify_button_coords');
    await waitForAllInstances('step8_verify_button_coords');

    // -----------------------------------------------------------------
    // ⚡️ FINAL EXECUTION SEQUENCE
    // -----------------------------------------------------------------
    
    console.log(`\n[Instance ${INSTANCE_ID}] *** 🚀 FINAL EXECUTION SEQUENCE STARTING NOW ***`);
    console.log(`[Instance ${INSTANCE_ID}] 💰 Bid Amount: ${BID_VALUE}`);
    console.log(`[Instance ${INSTANCE_ID}] 🎯 Targeting Product Index: ${PRODUCT_INDEX}`);
    console.log(`[Instance ${INSTANCE_ID}] ⏰ OK Click Offset: ${OK_BUTTON_OFFSET_SECONDS} seconds before target\n`);
    
    const allButtons = await page.$$('button');
    const placeBidButtons = [];

    for (const btn of allButtons) {
        const text = await page.evaluate(el => el.textContent.trim(), btn);
        if (text === "Place Bid") placeBidButtons.push(btn);
    }

    if (placeBidButtons.length <= PRODUCT_INDEX) {
        console.error(`[Instance ${INSTANCE_ID}] ❌ Error: Tried to find Product Index ${PRODUCT_INDEX}, but only found ${placeBidButtons.length} "Place Bid" buttons. Aborting.`);
        await browser.close();
        return;
    }
    
    console.log(`[Instance ${INSTANCE_ID}] ✅ Clicking "Place Bid" button at index [${PRODUCT_INDEX}]...`);
    await placeBidButtons[PRODUCT_INDEX].click();
    await delay(1500);
    await markStepComplete('step9_click_place_bid');
    await waitForAllInstances('step9_click_place_bid');

    const submitButtons = [];
    const btns = await page.$$('button');
    for (const btn of btns) {
        const text = await page.evaluate(el => el.textContent.trim(), btn);
        if (text === "Submit bid") submitButtons.push(btn);
    }

    if (submitButtons.length === 0) {
        console.error(`[Instance ${INSTANCE_ID}] ⚠️ Could not find initial "Submit bid" button!`);
        await browser.close();
        return;
    }

    console.log(`[Instance ${INSTANCE_ID}] ✅ Clicking "Submit bid" button...`);
    await page.evaluate(btn => btn.click(), submitButtons[0]);
    await markStepComplete('step10_click_submit_bid');
    await waitForAllInstances('step10_click_submit_bid');

    console.log(`[Instance ${INSTANCE_ID}] ⌛ Waiting for bid input field...`);
    await page.waitForSelector('input[name="bidVal"]'); 
    await page.type('input[name="bidVal"]', BID_VALUE);
    await markStepComplete('step11_fill_bid_amount');
    await waitForAllInstances('step11_fill_bid_amount');

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
        await browser.close();
        return;
    }

    console.log(`[Instance ${INSTANCE_ID}] ✅ Clicking final "Submit" button...`);
    await page.evaluate(btn => btn.click(), submitBtnFinal);
    await markStepComplete('step12_click_final_submit');
    await waitForAllInstances('step12_click_final_submit');

    console.log(`[Instance ${INSTANCE_ID}] ⏳ Waiting for 30 seconds for the popup to appear...`);
    await delay(30000);
    await markStepComplete('step13_wait_for_popup');
    await waitForAllInstances('step13_wait_for_popup');

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
        await browser.close();
        return; 
    }
    await markStepComplete('step14_find_ok_button');
    await waitForAllInstances('step14_find_ok_button');

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
    await markStepComplete('step15_wait_for_precise_time');
    await waitForAllInstances('step15_wait_for_precise_time');

    // -----------------------------------------------------------------
    // 🎯 STEP 16-17: INDEPENDENT EXECUTION (NO SYNCHRONIZATION)
    // -----------------------------------------------------------------
    
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

    await browser.close(); 
})();