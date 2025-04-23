import { FlowProducer, Worker, Queue } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis();

// Single queue for all jobs
const mainQueue = new Queue('scanQueue');
const flowProducer = new FlowProducer({ connection });

// Single worker handling all job types
new Worker('scanQueue', async (job) => {
  console.log(`Processing ${job.name}`);
  switch (job.name) {
    case 'getAllFiles':
      console.debug('Starting file scan...');
      let results = scan.getAllFiles(job.data.input);
      console.debug('File scan results:', ...results.entries());
      return [...results.entries()];
      // return { result: 'job1-completed' };
    case 'removeUniques':
      const condition = Math.random() > 0.5;
      // If condition is true, we'll skip job2b
      console.log(`Job2 condition: ${condition ? 'Skip job2b' : 'Run job2b'}`);
      return { result: 'job2-completed', condition };
    case 'job2b':
      return { result: 'job2b-completed' };
    case 'job3':
      return { result: 'job3-completed' };
  }
});

async function runFlow() {
  const flow = await flowProducer.add({
    name: 'job3',
    queueName: 'scanQueue',
    data: {},
    children: [{
      name: 'job2',
      queueName: 'scanQueue',
      data: {},
      children: [{
        name: 'getAllFiles',
        queueName: 'scanQueue',
        data: {}
      }]
    }]
  });

  // Set up a worker to listen for job2 completion and conditionally add job2b
  const job2Worker = new Worker('main-queue', async (job) => {
    if (job.name === 'job2' && !job.returnvalue.condition) {
      // Only add job2b if condition is false
      await flowProducer.add({
        name: 'job2b',
        queueName: 'scanQueue',
        data: {},
        children: [] // job3 is already scheduled
      });
    }
  }, { autorun: false });

  await job2Worker.close();
  console.log('Flow started:', flow);
}

runFlow().catch(console.error);
