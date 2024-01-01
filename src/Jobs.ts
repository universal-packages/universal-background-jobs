import { gatherAdapters, resolveAdapter } from '@universal-packages/adapter-resolver'
import { EventEmitter } from '@universal-packages/event-emitter'
import { camelCase, pascalCase, snakeCase } from 'change-case'
import { CronJob } from 'cron'

import BaseLoader from './BaseLoader'
import ConcurrentPerformer from './ConcurrentPerformer'
import { JobItem, JobsCollection, JobsOptions, LaterOptions, QueueInterface, QueueInterfaceClass } from './Jobs.types'
import JobsLoader from './JobsLoader'
import MemoryQueue from './MemoryQueue'
import TestQueue from './TestQueue'

export default class Jobs extends EventEmitter {
  public readonly options: JobsOptions
  public readonly jobsCollection: JobsCollection = {}
  public readonly queueNames: Set<string> = new Set()
  public readonly queue: QueueInterface

  private readonly performers: ConcurrentPerformer[] = []
  private readonly cronJobs: CronJob[] = []
  private readonly loaders: BaseLoader[] = []

  public constructor(options?: JobsOptions) {
    super()
    this.options = {
      concurrentPerformers: 1,
      jobsLocation: './src',
      loaders: {},
      loaderOptions: {},
      queue: process.env['NODE_ENV'] === 'test' ? 'test' : 'memory',
      queuePriority: {},
      ...options
    }

    this.queue = this.generateQueue()
    this.loaders = this.generateLoaders()
  }

  public async prepare(): Promise<void> {
    this.queue.prepare && (await this.queue.prepare())

    for (let i = 0; i < this.loaders.length; i++) {
      const loader = this.loaders[i]

      await loader.prepare()

      Object.assign(this.jobsCollection, loader.jobsCollection)

      for (const queueName of loader.queueNames) this.queueNames.add(queueName)
    }
  }

  public async release(): Promise<void> {
    this.queue.release && (await this.queue.release())

    for (let i = 0; i < this.loaders.length; i++) {
      const loader = this.loaders[i]

      await loader.release()
    }
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

      this.listenTo(performer, ['performed', 'retry', 'failed', 'error'])

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

      this.stopListeningTo(performer)
    }

    this.stopCronJobs()

    this.performers.length = 0

    await Promise.all(stopPromises)
  }

  private async performLater(item: JobItem, options?: LaterOptions): Promise<void> {
    await this.queue.enqueue(item, item.queue, options)

    this.emit('enqueued', { payload: { jobItem: item } })
  }

  private generateQueue(): QueueInterface {
    if (typeof this.options.queue === 'string') {
      const AdapterModule = resolveAdapter<QueueInterfaceClass>({
        name: this.options.queue,
        domain: 'background-jobs',
        type: 'queue',
        internal: { memory: MemoryQueue, test: TestQueue }
      })
      return new AdapterModule(this.options.queueOptions)
    } else {
      return this.options.queue
    }
  }

  private generateLoaders(): BaseLoader[] {
    const allLoaders = {
      ...this.options.loaders,
      ...gatherAdapters<typeof BaseLoader>({
        domain: 'background-jobs',
        type: 'loader',
        internal: [JobsLoader]
      })
    }
    const allLoadersNames = Object.keys(allLoaders)

    const loaders: BaseLoader[] = []
    const performLater = this.performLater.bind(this)

    for (let i = 0; i < allLoadersNames.length; i++) {
      const currentAllLoadersName = allLoadersNames[i]
      const LoaderClass = allLoaders[currentAllLoadersName]

      const baseName = currentAllLoadersName
      const possibleNameA = camelCase(baseName)
      const possibleNameB = pascalCase(baseName)
      const possibleNameC = snakeCase(baseName)
      const baseName2 = baseName.replace(/Loader$/, '')
      const possibleNameD = camelCase(baseName2)
      const possibleNameE = pascalCase(baseName2)
      const possibleNameF = snakeCase(baseName2)
      const passedOptions =
        this.options.loaderOptions[possibleNameA] ||
        this.options.loaderOptions[possibleNameB] ||
        this.options.loaderOptions[possibleNameC] ||
        this.options.loaderOptions[possibleNameD] ||
        this.options.loaderOptions[possibleNameE] ||
        this.options.loaderOptions[possibleNameF] ||
        {}

      loaders.push(new LoaderClass({ jobsLocation: this.options.jobsLocation, performLater, passedOptions }))
    }

    return loaders
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
