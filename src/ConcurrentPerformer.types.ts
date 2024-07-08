import { JobsCollection, QueueInterface, QueuePriority } from './BackgroundJobs.types'

export interface ConcurrentPerformerOptions {
  jobs: JobsCollection
  queue: QueueInterface
  queueNames: string[]
  queuePriority: QueuePriority
  waitTimeIfEmptyRound: number
}
