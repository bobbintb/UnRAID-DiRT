import { Queue } from 'bullmq';

export class newQueue extends Queue {
  constructor(name, opts) {
    super(name, opts)
  }

  async upsert(name, data, opts = {}) {
    // Attempt to find an existing job based on its data (you may want to query by a unique identifier)
    const jobs = await this.getJobs(['waiting', 'delayed', 'active'])
    console.debug('jobs', jobs)

    const existingJob = (await queue.getJobs()).find(job => job.data === inode);

    console.debug('existingJob', existingJob)

    if (existingJob) {
      // If the job exists and the data matches, update the name
      existingJob.name = name
      return existingJob  // Return the updated job
    } else {
      // If no job found, add it as a new job to the queue
      const newJob = await this.add(name, data, opts)
      return newJob  // Return the new job
    }
  }
}