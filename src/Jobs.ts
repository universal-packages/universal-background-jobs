import { loadModules } from '@universal-packages/module-loader'
import { RedisQueue } from '@universal-packages/redis-queue'
import EventEmitter from 'events'

import BaseJob from './BaseJob'
import { JobItem, JobsCollection, JobsOptions } from './Jobs.types'

export default class Jobs extends EventEmitter {
  public readonly options: JobsOptions
  public readonly redisQueue: RedisQueue
  public readonly jobsCollection: JobsCollection = {}
  public readonly queues: Set<string> = new Set()

  public constructor(options?: JobsOptions) {
    super()
    this.options = { additional: [], jobsLocation: './src', identifier: 'jobs', ...options }

    this.redisQueue = new RedisQueue(this.options)
  }

  public async prepare(): Promise<void> {
    await this.redisQueue.connect()
    await this.loadJobs()

    for (let i = 0; i < this.options.additional.length; i++) {
      await this.loadJobs(this.options.additional[i].location || this.options.jobsLocation, this.options.additional[i].conventionPrefix)
    }
  }

  public async release(): Promise<void> {
    await this.redisQueue.disconnect()
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
        this.queues.add(Job.queue)

        Job['__performLater'] = this.performLater.bind(this)
        Job['__srcFile'] = currentModule.location
      }
    }
  }

  private async performLater(item: JobItem, options?: { at?: Date; wait?: string }): Promise<void> {
    await this.redisQueue.enqueue(item, item.queue, options)
    this.emit('enqueued', { jobItem: item })
  }
}
