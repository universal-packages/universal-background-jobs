import BaseJob from './BaseJob'
import BaseLoader from './BaseLoader'

export type JobStatus = 'waiting' | 'failed' | 'performed'
export type PerformLaterFunction = (data: Record<string, any>, options?: LaterOptions) => Promise<void> | void

export interface JobsOptions {
  concurrentPerformers?: number
  jobsLocation?: string
  loaders?: Loaders
  loaderOptions?: Record<string, any>
  queue?: string | QueueInterface
  queueOptions?: Record<string, any>
  queuePriority?: QueuePriority
  waitTimeIfEmptyRound?: number
}

export interface Loaders {
  [name: string]: typeof BaseLoader
}

export interface JobItem {
  payload?: Record<string, any>
  doneAt?: number
  error?: {
    message: string
    stack: string
  }
  srcFile: string
  name: string
  maxRetries: number
  queue: string
  retries?: number
  retryAfter: string
  lastRetryAt?: number
}

export interface JobsCollection {
  [name: string]: typeof BaseJob
}

export interface Schedule {
  cronTime: string | Date
  timeZone?: string
}

export interface LaterOptions {
  at?: Date
  wait?: string
}

export interface LoaderOptions {
  jobsLocation: string
  performLater: PerformLaterFunction
  passedOptions: Record<string, any>
}

export interface QueueInterface {
  prepare?: () => void | Promise<void>
  release?: () => void | Promise<void>
  clear: () => void | Promise<void>
  enqueue: (item: JobItem, queue: string, options?: LaterOptions) => void | Promise<void>
  dequeue: (queue: string) => JobItem | Promise<JobItem>
}

export interface QueueInterfaceClass {
  new (...args: any[]): QueueInterface
}

export interface QueuePriority {
  [queue: string]: number
}
