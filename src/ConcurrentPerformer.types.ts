import { JobsCollection, QueueInterface, QueuePriority } from './Jobs.types'

export interface ConcurrentPerformerOptions {
  jobs: JobsCollection
  queue: QueueInterface
  queueNames: string[]
  queuePriority: QueuePriority
  waitTimeIfEmptyRound: number
}
