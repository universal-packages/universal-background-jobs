import { sleep, startMeasurement } from '@universal-packages/time-measurer'
import { EventEmitter } from 'stream'
import BaseJob from './BaseJob'
import { ConcurrentPerformerOptions } from './ConcurrentPerformer.types'
import { JobItem } from './Jobs.types'

export default class ConcurrentPerformer extends EventEmitter {
  private readonly options: ConcurrentPerformerOptions

  private currentQueueIndex = 0
  private currentQueue: string = 'default'
  private currentQueueCount = 0
  private processedInRound = 0
  private lastRoundWasEmpty = false

  private processNextPromise: Promise<void>
  private stopping = false

  public constructor(options: ConcurrentPerformerOptions) {
    super()
    this.options = options
    this.currentQueue = this.options.queues[this.currentQueueIndex]
  }

  public async start(): Promise<void> {
    this.processNextPromise = this.processNext()
  }

  public async stop(): Promise<void> {
    this.stopping = true
    await this.processNextPromise
  }

  private async processNext(): Promise<void> {
    // If a directive of stop has been passed we do not continue
    if (this.stopping) return

    // If last round we didn't processed anything we do a small wait so we do not
    // over use redis asking too much for something that is not there
    if (this.lastRoundWasEmpty) {
      await sleep(this.options.waitTimeIfEmptyRound)

      // If after the iddle sleep we encounter an stopping directive we do not continue
      if (this.stopping) return
    }

    const mesaurer = startMeasurement()
    const queueItem = await this.options.redisQueue.dequeue(this.currentQueue)

    if (queueItem) {
      const jobItem = queueItem.payload as JobItem
      const JobClass = this.options.jobs[jobItem.name]

      if (JobClass) {
        try {
          const jobInstance: BaseJob = new JobClass()

          await jobInstance.perform(jobItem.payload)

          const measurement = mesaurer.finish()

          this.emit('performed', { jobItem, measurement })
        } catch (error) {
          const measurement = mesaurer.finish()

          // Jobs can be re-enqueued if it was configured
          const shouldRetry = (jobItem.retries || 0) < jobItem.maxRetries

          jobItem.error = { message: error.message, stack: error.stack }

          if (shouldRetry) {
            jobItem.retries = (jobItem.retries || 0) + 1

            await this.options.redisQueue.enqueue(jobItem, jobItem.queue, { wait: jobItem.retryAfter })

            this.emit('retry', { jobItem, measurement })
          } else {
            this.emit('failed', { jobItem, measurement })
          }
        }
      } else {
        this.emit('error', { error: new Error('No Job class loadaded to perform this job'), jobItem })
      }
      this.processedInRound++

      // We continue naturally with priorities
      this.selectPriority()
    } else {
      // We go direct to the next priority to see if there is something there
      this.selectPriority(true)
    }

    this.processNextPromise = this.processNext()
  }

  private selectPriority(byPass = false): void {
    this.currentQueueCount = this.currentQueueCount + 1

    if ((this.options.queuePriority[this.currentQueue] || 1) === this.currentQueueCount || byPass) {
      this.currentQueueIndex = this.currentQueueIndex + 1

      if (this.currentQueueIndex === this.options.queues.length) {
        this.currentQueueIndex = 0

        this.lastRoundWasEmpty = this.processedInRound === 0
        this.processedInRound = 0
      }

      this.currentQueue = this.options.queues[this.currentQueueIndex]
      this.currentQueueCount = 0
    }
  }
}
