import { EventEmitter } from '@universal-packages/event-emitter'
import { sleep, startMeasurement } from '@universal-packages/time-measurer'

import BaseJob from './BaseJob'
import { ConcurrentPerformerOptions } from './ConcurrentPerformer.types'

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
    this.currentQueue = this.options.queueNames[this.currentQueueIndex]
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

      // If after the idle sleep we encounter an stopping directive we do not continue
      if (this.stopping) return
    }

    const measurer = startMeasurement()

    const jobItem = await this.options.queue.dequeue(this.currentQueue)

    if (jobItem) {
      const JobClass = this.options.jobs[jobItem.name]

      if (JobClass) {
        try {
          const jobInstance: BaseJob = new JobClass()

          await jobInstance.perform(jobItem.payload)

          const measurement = measurer.finish()

          this.emit('performed', { measurement, payload: { jobItem } })
        } catch (error) {
          const measurement = measurer.finish()

          // Jobs can be re-enqueued if it was configured
          const shouldRetry = (jobItem.retries || 0) < jobItem.maxRetries

          jobItem.error = { message: error.message, stack: error.stack }

          if (shouldRetry) {
            jobItem.retries = (jobItem.retries || 0) + 1

            await this.options.queue.enqueue({ ...jobItem }, jobItem.queue, { wait: jobItem.retryAfter })

            this.emit('retry', { measurement, payload: { jobItem } })
          } else {
            this.emit('failed', { measurement, payload: { jobItem } })
          }
        }
      } else {
        const error = new Error('No Job class loaded to perform this job')

        this.emit('error', { error, payload: { jobItem } })
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

      if (this.currentQueueIndex === this.options.queueNames.length) {
        this.currentQueueIndex = 0

        this.lastRoundWasEmpty = this.processedInRound === 0
        this.processedInRound = 0
      }

      this.currentQueue = this.options.queueNames[this.currentQueueIndex]
      this.currentQueueCount = 0
    }
  }
}
