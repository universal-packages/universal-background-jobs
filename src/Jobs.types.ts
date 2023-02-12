import { RedisClientOptions, RedisClientType, RedisFunctions, RedisModules, RedisScripts } from 'redis'
import BaseJob from './BaseJob'

export type JobStatus = 'waiting' | 'failed' | 'performed'
export type PerformLaterFunction = (data: Record<string, any>, options?: { at?: Date; wait?: string }) => Promise<void> | void

export interface JobsOptions extends RedisClientOptions {
  additional?: Additional[]
  client?: RedisClientType<RedisModules, RedisFunctions, RedisScripts>
  identifier?: string
  jobsLocation?: string
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

export interface Additional {
  conventionPrefix: string
  location?: string
}

export interface LaterOptions {
  at?: Date
  wait?: string
}
