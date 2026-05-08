const { Worker: BullWorker } = require('bullmq'); // Renamed to avoid conflict
const os = require('os');
const path = require('path');
const { Worker } = require('worker_threads');
const { handleFileGroup } = require('./file-group-processor.js');
// handlers.js will be created in a subsequent step and will contain the job processing logic.
const handlers = require('./handlers.js');

const { fileProcessingQueue } = require('./redis.js');
const { sharedEmitter } = require('./events.js');

const connection = {
  host: 'localhost',
  port: 6379
};

/**
 * Creates a pool of worker threads to handle CPU-intensive hashing tasks.
 * @returns {Worker[]} An array of worker instances.
 */
function createWorkerPool() {
    // Leave one core for the main thread and other system tasks.
    const numCores = os.cpus().length;
    const numWorkers = Math.max(1, numCores - 1);
    const workers = [];

    console.log(`[DIRT] Initializing a pool of ${numWorkers} worker thread(s) for hashing.`);

    for (let i = 0; i < numWorkers; i++) {
        const workerPath = path.resolve(__dirname, 'hash-worker.js');
        workers.push(new Worker(workerPath));
    }
    return workers;
}

/**
 * Terminates all workers in the pool.
 * @param {Worker[]} workerPool - The pool of workers to terminate.
 */
async function terminateWorkerPool(workerPool) {
    console.log('[DIRT] Terminating worker pool.');
    await Promise.all(workerPool.map(worker => worker.terminate()));
}

// Create a persistent worker pool to be used by all jobs.
const workerPool = createWorkerPool();

const worker = new BullWorker('file-processing', async (job) => {
  console.log(`[WORKER] Received job ${job.id} of type ${job.name}`);

  switch (job.name) {
    case 'file-group':
      await handleFileGroup(job, workerPool);
      break;
    case 'upsert':
      await handlers.handleUpsert(job, workerPool);
      break;
    case 'remove':
      await handlers.handleRemove(job);
      break;
    case 'rename':
      await handlers.handleRename(job);
      break;
    default:
      console.error(`[WORKER] Unknown job name: ${job.name}`);
      throw new Error(`Unknown job name: ${job.name}`);
  }
}, { connection });

// Gracefully shut down the worker pool when the process is terminated.
const gracefulShutdown = async () => {
  console.log('[WORKER] Shutting down...');
  await terminateWorkerPool(workerPool);
  await worker.close();
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);


// This function checks if the queue is idle and emits an event.
const checkQueueIdle = async () => {
  const waiting = await fileProcessingQueue.getWaitingCount();
  const active = await fileProcessingQueue.getActiveCount();

  if (waiting === 0 && active === 0) {
    console.log('[WORKER] All jobs have been processed. Emitting queueIdle event.');
    sharedEmitter.emit('queueIdle');
  }
};

worker.on('completed', async (job) => {
  console.log(`[WORKER] Job ${job.id} has completed.`);
  await checkQueueIdle();
});

worker.on('failed', async (job, err) => {
  console.error(`[WORKER] Job ${job.id} has failed with error: ${err.message}`);
  await checkQueueIdle(); // Also check if idle on failure
});

module.exports = worker;