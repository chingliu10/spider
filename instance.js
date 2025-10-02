import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import { weAreIn } from './weAreIn.js';

(async () => {
    // -----------------------------------------------------------------
    // ⚙️ CONFIGURATION AND TIME MANAGEMENT
    // -----------------------------------------------------------------
    
    // --- NEW TARGET TIME: 1:42 PM EAT (13:42:00) ---
    const TARGET_HOUR = 19;      
    const TARGET_MINUTE = 48;     
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
    let isFinalExecution = false;
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
    // Execute the final bid sequence
   
    await weAreIn(isFinalExecution, page, PLACE_BID_SELECTOR, TARGET_BID_TIME_MS, FINAL_RUN_THRESHOLD_MS);


    // -----------------------------------------------------------------
    await browser.close(); 
})();