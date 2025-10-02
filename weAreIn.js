import fs from 'fs/promises';

export async  function weAreIn (isFinalExecution, page, timeRemainingMs, PLACE_BID_SELECTOR, TARGET_BID_TIME_MS, FINAL_RUN_THRESHOLD_MS) {


    // Load product URL outside the loop
    const data = await fs.readFile('products.json', 'utf-8');
    const products = JSON.parse(data);
    let url = products.url;
    


    // --- 1. Navigate to the product page ---
    console.log(`🌐 Navigating to product URL: ${url}`); 
    const navigationWait = isFinalExecution ? 'networkidle2' : 'networkidle2';
    await page.goto(url, { waitUntil: navigationWait }); 



    //place bid button

    let placeBidButton ;

    try {
        placeBidButton = await page.waitForSelector(PLACE_BID_SELECTOR, { visible : true, timeout : 15000 })
        console.log("PLACE BID FOUND")
    }catch(e) {
        console.log("Timeout Exceeded")
        return false
    }



    // Get initial coordinates from JSON (used for scrolling)
    const firstProduct = products.products[0];
    const coords = Object.values(firstProduct)[0];
    const btnX = coords.x;
    const btnY = coords.y;



    // Scroll to the area based on json
    console.log("We are scrolling") 
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




        return true;

    }

     // -----------------------------------------------------------------
    // ⏰ TIMED RELOAD AND EXECUTION LOOP
    // ------------------------------------------------------------------

     // console.log(`\n⏳ Target Bid Time (Adjusted for latency): ${new Date(TARGET_BID_TIME_MS).toLocaleTimeString()} (${TARGET_BID_TIME_MS})`);
    
    let timeRemainingMs = TARGET_BID_TIME_MS - Date.now();
  
    console.log("time remaing to go and bid")
    console.log("Time Remaining is " + timeRemainingMs + "and final seconds are " + FINAL_RUN_THRESHOLD_MS);
    return false;
}


export async function loopUntilTimeReaches () {

      while (timeRemainingMs > FINAL_RUN_THRESHOLD_MS) {
        //  console.log("we need to go and bid")
        if (!initialMapDone || timeRemainingMs < RELOAD_THRESHOLD_MS) { 



        }else {

        }


        timeRemainingMs = TARGET_BID_TIME_MS - Date.now();

    }

} 