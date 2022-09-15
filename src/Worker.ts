import { CronJob } from 'cron'
import ConcurrentPerformer from './ConcurrentPerformer'
import Jobs from './Jobs'
import { JobsWorkerOptions } from './Worker.types'

export default class Worker extends Jobs {
  public readonly options: JobsWorkerOptions

  private readonly performers: ConcurrentPerformer[] = []
  private readonly cronJobs: CronJob[] = []

  public constructor(options: JobsWorkerOptions) {
    super(options)
    this.options = { concurrentPerformers: 1, queuePriority: {}, ...options }
  }

  public async run(): Promise<void> {
    const startPromises: Promise<void>[] = []

    this.startCronJobs()

    for (let i = 0; i < this.options.concurrentPerformers; i++) {
      const performer = new ConcurrentPerformer({
        jobs: this.jobsCollection,
        redisQueue: this.redisQueue,
        queues: Array.from(this.queues),
        queuePriority: this.options.queuePriority,
        waitTimeIfEmptyRound: this.options.waitTimeIfEmptyRound || 1000
      })

      performer.on('performed', (...args: any[]): boolean => this.emit('performed', ...args))
      performer.on('retry', (...args: any[]): boolean => this.emit('retry', ...args))
      performer.on('failed', (...args: any[]): boolean => this.emit('failed', ...args))
      performer.on('error', (...args: any[]): boolean => this.emit('error', ...args))

      startPromises.push(performer.start())

      this.performers.push(performer)
    }

    await Promise.all(startPromises)
  }

  public async stop(): Promise<void> {
    const stopPromises: Promise<void>[] = []

    for (let i = 0; i < this.performers.length; i++) {
      const performer = this.performers[i]

      stopPromises.push(performer.stop())
    }

    this.stopCronJobs()

    await Promise.all(stopPromises)
  }

  private startCronJobs(): void {
    const jobKeys = Object.keys(this.jobsCollection)

    for (let i = 0; i < jobKeys.length; i++) {
      const CurrentJob = this.jobsCollection[jobKeys[i]]

      if (CurrentJob.schedule) {
        const cronJob = new CronJob(CurrentJob.schedule.cronTime, (): Promise<void> => CurrentJob.performLater(), null, true, CurrentJob.schedule.timeZone)
        this.cronJobs.push(cronJob)
      }
    }
  }

  private stopCronJobs(): void {
    for (let i = 0; i < this.cronJobs.length; i++) {
      this.cronJobs[i].stop()
    }
  }
}
