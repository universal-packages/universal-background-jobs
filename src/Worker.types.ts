import { JobsOptions } from './Jobs.types'

export interface JobsWorkerOptions extends JobsOptions {
  concurrentPerformers?: number
  queuePriority?: QueuePriority
  waitTimeIfEmptyRound?: number
}

export interface QueuePriority {
  [queue: string]: number
}
