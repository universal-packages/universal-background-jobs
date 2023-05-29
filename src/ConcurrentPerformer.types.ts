import { RedisQueue } from '@universal-packages/redis-queue'

import { JobsCollection } from './Jobs.types'
import { QueuePriority } from './Worker.types'

export interface ConcurrentPerformerOptions {
  jobs: JobsCollection
  redisQueue: RedisQueue
  queues: string[]
  queuePriority: QueuePriority
  waitTimeIfEmptyRound: number
}
