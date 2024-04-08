import { JobItem, LaterOptions, QueueInterface } from './Jobs.types'

interface HistoryEntry {
  item: JobItem
  queue: string
  options: LaterOptions
}

export default class TestQueue implements QueueInterface {
  public static readonly enqueueRequests: HistoryEntry[] = []
  public static readonly dequeueRequests: string[] = []

  public static reset() {
    TestQueue.enqueueRequests.length = 0
    TestQueue.dequeueRequests.length = 0
  }

  public enqueue(item: JobItem, queue: string, options?: LaterOptions): void {
    TestQueue.enqueueRequests.push({ item, queue, options })
  }

  public clear(): void | Promise<void> {
    // no-op
  }

  public dequeue(queue: string): JobItem {
    TestQueue.dequeueRequests.push(queue)

    return
  }
}
