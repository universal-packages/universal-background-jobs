import { resolveAdapter } from '@universal-packages/adapter-resolver'
import { loadModules } from '@universal-packages/module-loader'
import { CronJob } from 'cron'
import EventEmitter from 'events'

import BaseJob from './BaseJob'
import ConcurrentPerformer from './ConcurrentPerformer'
import { JobItem, JobsCollection, JobsOptions, LaterOptions, QueueInterface, QueueInterfaceClass } from './Jobs.types'
import MemoryQueue from './MemoryQueue'
import TestQueue from './TestQueue'

export default class Jobs extends EventEmitter {
  public readonly options: JobsOptions
  public readonly jobsCollection: JobsCollection = {}
  public readonly queueNames: Set<string> = new Set()
  public readonly queue: QueueInterface

  private readonly performers: ConcurrentPerformer[] = []
  private readonly cronJobs: CronJob[] = []

  public constructor(options?: JobsOptions) {
    super()
    this.options = {
      additional: [],
      concurrentPerformers: 1,
      jobsLocation: './src',
      queue: process.env['NODE_ENV'] === 'test' ? 'test' : 'memory',
      queuePriority: {},
      ...options
    }

    this.queue = this.generateQueue()
  }

  public async prepare(): Promise<void> {
    this.queue.prepare && (await this.queue.prepare())
    await this.loadJobs()

    for (let i = 0; i < this.options.additional.length; i++) {
      await this.loadJobs(this.options.additional[i].location || this.options.jobsLocation, this.options.additional[i].conventionPrefix)
    }
  }

  public async release(): Promise<void> {
    this.queue.release && (await this.queue.release())
  }

  public async run(): Promise<void> {
    const startPromises: Promise<void>[] = []

    this.startCronJobs()

    for (let i = 0; i < this.options.concurrentPerformers; i++) {
      const performer = new ConcurrentPerformer({
        jobs: this.jobsCollection,
        queue: this.queue,
        queueNames: Array.from(this.queueNames),
        queuePriority: this.options.queuePriority,
        waitTimeIfEmptyRound: this.options.waitTimeIfEmptyRound || 1000
      })

      performer.on('*', (...args: any[]): boolean => this.emit('*', ...args))
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

  private async loadJobs(directory?: string, conventionPrefix = 'job'): Promise<void> {
    const modules = await loadModules(directory || this.options.jobsLocation, { conventionPrefix })

    for (let i = 0; i < modules.length; i++) {
      const currentModule = modules[i]

      if (currentModule.error) {
        throw currentModule.error
      } else {
        const Job: typeof BaseJob = currentModule.exports
        this.jobsCollection[Job.name] = currentModule.exports
        this.queueNames.add(Job.queue)

        Job['__performLater'] = this.performLater.bind(this)
        Job['__srcFile'] = currentModule.location
      }
    }
  }

  private async performLater(item: JobItem, options?: LaterOptions): Promise<void> {
    await this.queue.enqueue(item, item.queue, options)

    this.emit('*', { event: 'enqueued', payload: { jobItem: item } })
    this.emit('enqueued', { event: 'enqueued', payload: { jobItem: item } })
  }

  private generateQueue(): QueueInterface {
    if (typeof this.options.queue === 'string') {
      const AdapterModule = resolveAdapter<QueueInterfaceClass>(this.options.queue, {
        domain: 'background-jobs',
        type: 'queue',
        internal: { memory: MemoryQueue, test: TestQueue }
      })
      return new AdapterModule(this.options.queueOptions)
    } else {
      return this.options.queue
    }
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
