// ============================================
// FILE: launch-multiple.js (Smart Sequential Launcher)
// ============================================

import { spawn } from 'child_process';

const LAUNCH_DELAY_MS = 20000; // time between launches
const MAX_WAIT_BEFORE_NEXT = 30000; // 30s grace to let it initialize fully

const instances = [
  { id: 1, productIndex: 0, okButtonOffset: 1, bidAmount: '305705.4', description: 'Product [0] @ 5s' },
  { id: 2, productIndex: 0, okButtonOffset: 1, bidAmount: '305705.4', description: 'Product [0] @ 4s' },
  { id: 3, productIndex: 0, okButtonOffset: 0, bidAmount: '305705.4', description: 'Product [0] @ 4s' },
    { id: 4, productIndex: 1, okButtonOffset: 1, bidAmount: '8863202.7', description: 'Product [0] @ 5s' },
  { id: 5, productIndex: 1, okButtonOffset: 1, bidAmount: '8863202.7', description: 'Product [0] @ 4s' },
  { id: 6, productIndex: 1, okButtonOffset: 0, bidAmount: '8863202.7', description: 'Product [0] @ 4s' },
    { id: 7, productIndex: 2, okButtonOffset: 1, bidAmount: '15901333.8', description: 'Product [0] @ 5s' },
  { id: 8, productIndex: 2, okButtonOffset: 1, bidAmount: '15901333.8', description: 'Product [0] @ 4s' },
  { id: 9, productIndex: 2, okButtonOffset: 0, bidAmount: '15901333.8', description: 'Product [0] @ 4s' },
  // { id: 7, productIndex: 1, okButtonOffset: 2, bidAmount: '89861911.70', description: 'Product [0] @ 4s' },
  //    { id: 8, productIndex: 0, okButtonOffset: 2, bidAmount: '12464672', description: 'Product [0] @ 5s' },
  //  { id: 9, productIndex: 0, okButtonOffset: 2, bidAmount: '12464672', description: 'Product [0] @ 4s' },
  //  { id: 9, productIndex: 0, okButtonOffset: 3, bidAmount: '12464672', description: 'Product [0] @ 4s' },
  // add more...
];

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function launchInstance(instance) {
  return new Promise((resolve) => {
    console.log(`\n📍 Launching Instance ${instance.id}: ${instance.description}`);

    const child = spawn('node', ['auction-bidder.js'], {
      env: {
        ...process.env,
        INSTANCE_ID: instance.id,
        OK_BUTTON_OFFSET_SECONDS: instance.okButtonOffset,
        BID_AMOUNT: instance.bidAmount,
        PRODUCT_INDEX: instance.productIndex,
      },
      stdio: 'inherit',
      shell: true,
    });

    let exited = false;

    child.on('close', (code) => {
      exited = true;
      if (code === 0) {
        console.log(`✅ Instance ${instance.id} completed successfully`);
        resolve('done');
      } else {
        console.warn(`⚠️ Instance ${instance.id} exited with code ${code}, retrying...`);
        setTimeout(() => resolve('retry'), 10000);
      }
    });

    child.on('error', (err) => {
      console.error(`❌ Failed to start instance ${instance.id}:`, err);
      setTimeout(() => resolve('retry'), 10000);
    });

    // Don’t block launcher if process stays alive for too long (idle waiting)
    setTimeout(() => {
      if (!exited) {
        console.log(`⏩ Instance ${instance.id} still running (OK wait). Launching next...`);
        resolve('continue');
      }
    }, MAX_WAIT_BEFORE_NEXT);
  });
}

async function launchSequentially() {
  console.log('🚀 Starting Multi-Instance Auction Bidder');
  console.log('='.repeat(60));
  console.log(`⏳ Delay between launches: ${LAUNCH_DELAY_MS / 1000}s`);
  console.log(`📊 Total instances: ${instances.length}\n`);

  for (const instance of instances) {
    while (true) {
      const result = await launchInstance(instance);
      if (result === 'done' || result === 'continue') break; // proceed
    }
    console.log(`\n... Waiting ${LAUNCH_DELAY_MS / 1000}s before next launch ...`);
    await delay(LAUNCH_DELAY_MS);
  }

  console.log('\n✅ All instances started successfully!');
}

launchSequentially();
