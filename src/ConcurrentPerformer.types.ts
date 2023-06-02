import { JobsCollection, QueueInterface } from './Jobs.types'
import { QueuePriority } from './Worker.types'

export interface ConcurrentPerformerOptions {
  jobs: JobsCollection
  queue: QueueInterface
  queueNames: string[]
  queuePriority: QueuePriority
  waitTimeIfEmptyRound: number
}
