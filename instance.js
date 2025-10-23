// ============================================
// FILE 2: launch-multiple.js (Launcher script)
// ============================================

import { spawn } from 'child_process';

// ⭐ --- ADD A STAGGERED LAUNCH DELAY ---
// This is the delay BETWEEN launching each instance (in milliseconds)
// to allow the previous instance to get through the login page.
const LAUNCH_DELAY_MS = 15000; // 15 seconds

// ⭐ --- ADD 'productIndex' TO EACH INSTANCE ---
// productIndex: 0 = first "Place Bid" button
// productIndex: 1 = second "Place Bid" button
const instances = [
//  { id: 1, productIndex: 0, okButtonOffset: 5, bidAmount: '22000000', description: 'Product [0] @ 3s' },
 { id: 2, productIndex: 0, okButtonOffset: 4, bidAmount: '22000000', description: 'Product [1] @ 2s' },
  { id: 3, productIndex: 0, okButtonOffset: 3, bidAmount: '22000000', description: 'Product [0] @ 3s' },
 { id: 4, productIndex: 0, okButtonOffset: 1, bidAmount: '22000000', description: 'Product [1] @ 2s' },
  { id: 5, productIndex: 0, okButtonOffset: 2, bidAmount: '22000000', description: 'Product [0] @ 3s' },
  //  { id: 8, productIndex: 1, okButtonOffset: 5, bidAmount: '45000000', description: 'Product [1] @ 2s' },
  { id: 7, productIndex: 1, okButtonOffset: 4, bidAmount: '45000000', description: 'Product [0] @ 3s' },
  { id: 9, productIndex: 1, okButtonOffset: 3, bidAmount: '45000000', description: 'Product [0] @ 3s' },
 { id: 10, productIndex: 1, okButtonOffset: 1, bidAmount: '45000000', description: 'Product [1] @ 2s' },
 { id: 11, productIndex: 1, okButtonOffset: 2, bidAmount: '44500000', description: 'Product [1] @ 2s' },
//  { id: 12, productIndex: 2, okButtonOffset: 5, bidAmount: '73000000', description: 'Product [0] @ 3s' },
 { id: 13, productIndex: 2, okButtonOffset: 4, bidAmount: '73000000', description: 'Product [1] @ 2s' },
  { id: 14, productIndex: 2, okButtonOffset: 3, bidAmount: '72500000', description: 'Product [0] @ 3s' },
 { id: 15, productIndex: 2, okButtonOffset: 1, bidAmount: '73000000', description: 'Product [1] @ 2s' },
 { id: 16, productIndex: 2, okButtonOffset: 2, bidAmount: '73000000', description: 'Product [1] @ 2s' },
];

// Helper delay function
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// ⭐ --- CREATE AN ASYNC LAUNCHER FUNCTION ---
const launchInstancesSequentially = async () => {
    console.log('🚀 Starting Multi-Instance Auction Bidder (Sequential Launch)');
    console.log('='.repeat(60));
    console.log(`⏳ Launch delay between instances: ${LAUNCH_DELAY_MS / 1000} seconds\n`);

    // Use a 'for...of' loop to support 'await'
    for (const instance of instances) {
        console.log(`\n📍 Launching Instance ${instance.id}: ${instance.description}`);
        console.log(`   Product Index: ${instance.productIndex}`);
        console.log(`   OK Button Offset: ${instance.okButtonOffset} seconds`);
        console.log(`   Bid Amount: ${instance.bidAmount}`);
        
        const child = spawn('node', ['auction-bidder.js'], {
            env: {
                ...process.env,
                INSTANCE_ID: instance.id,
                OK_BUTTON_OFFSET_SECONDS: instance.okButtonOffset,
                BID_AMOUNT: instance.bidAmount,
                // ⭐ --- PASS THE NEW INDEX ---
                PRODUCT_INDEX: instance.productIndex 
            },
            stdio: 'inherit',
            shell: true
        });
        
        child.on('error', (error) => {
            console.error(`❌ Instance ${instance.id} error:`, error);
        });
        
        child.on('close', (code) => {
            console.log(`\n✅ Instance ${instance.id} finished with code ${code}`);
        });

        // ⭐ --- WAIT before launching the next one ---
        console.log(`\n... Waiting ${LAUNCH_DELAY_MS / 1000}s before next launch ...`);
        await delay(LAUNCH_DELAY_MS);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All instances launched!\n');
};

// Start the sequential launcher
launchInstancesSequentially();