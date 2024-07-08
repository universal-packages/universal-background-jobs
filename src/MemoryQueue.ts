import ms from 'ms'

import { JobItem, LaterOptions, QueueInterface } from './BackgroundJobs.types'

export default class MemoryQueue implements QueueInterface {
  private static internalQueues: Record<string, { item: JobItem; notBefore: number }[]> = {}

  public clear(): void {
    MemoryQueue.internalQueues = {}
  }

  public enqueue(item: JobItem, queue: string, options?: LaterOptions): void {
    if (!MemoryQueue.internalQueues[queue]) {
      MemoryQueue.internalQueues[queue] = []
    }
    let notBefore

    if (options?.at) {
      notBefore = options.at.getTime()
    } else if (options?.wait) {
      notBefore = Date.now() + ms(options.wait)
    }

    MemoryQueue.internalQueues[queue].push({ item, notBefore })
  }

  public dequeue(queue: string): JobItem {
    if (!MemoryQueue.internalQueues[queue]) return

    const internalItem = MemoryQueue.internalQueues[queue].shift()

    if (!internalItem) return

    if (internalItem.notBefore && internalItem.notBefore > Date.now()) {
      MemoryQueue.internalQueues[queue].push(internalItem)
      return
    }

    return internalItem.item
  }
}
