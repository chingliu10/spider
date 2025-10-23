

// ============================================
// FILE 2: launch-multiple.js (Launcher script)
// ============================================

import { spawn } from 'child_process';

const instances = [
    { id: 1, okButtonOffset: 3, bidAmount: '55000000', description: '1 Trillion @ 5s' },
    { id: 2, okButtonOffset: 2, bidAmount: '55000000', description: '500 Billion @ 4s' },
    { id: 3, okButtonOffset: 1, bidAmount: '55000000', description: '100 Billion @ 3s' },
    { id: 3, okButtonOffset: 1, bidAmount: '55000000', description: '100 Billion @ 3s' },
];

console.log('🚀 Starting Multi-Instance Auction Bidder\n');
console.log('='.repeat(60));

instances.forEach((instance, index) => {
    console.log(`\n📍 Instance ${instance.id}: ${instance.description}`);
    console.log(`   OK Button Offset: ${instance.okButtonOffset} seconds`);
    console.log(`   Bid Amount: ${instance.bidAmount}`);
    
    const child = spawn('node', ['auction-bidder.js'], {
        env: {
            ...process.env,
            INSTANCE_ID: instance.id,
            OK_BUTTON_OFFSET_SECONDS: instance.okButtonOffset,
            BID_AMOUNT: instance.bidAmount
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
});

console.log('\n' + '='.repeat(60));
console.log('✅ All instances launched!\n');
