import { resolveAdapter } from '@universal-packages/adapter-resolver'
import { loadModules } from '@universal-packages/module-loader'
import EventEmitter from 'events'

import BaseJob from './BaseJob'
import { JobItem, JobsCollection, JobsOptions, LaterOptions, QueueInterface, QueueInterfaceClass } from './Jobs.types'
import MemoryQueue from './MemoryQueue'
import TestQueue from './TestQueue'

export default class Jobs extends EventEmitter {
  public readonly options: JobsOptions
  public readonly jobsCollection: JobsCollection = {}
  public readonly queueNames: Set<string> = new Set()
  public readonly queue: QueueInterface

  public constructor(options?: JobsOptions) {
    super()
    this.options = { additional: [], queue: 'memory', identifier: 'jobs', jobsLocation: './src', ...options }

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
    this.emit('enqueued', { jobItem: item })
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
}
