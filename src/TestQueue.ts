import { JobItem, LaterOptions, QueueInterface } from './Jobs.types'

export default class TestQueue implements QueueInterface {
  public static mock: any

  public static setMock(mock: any): void {
    this.mock = mock
  }
  public clear(): void {}

  public enqueue(item: JobItem, queue: string, options?: LaterOptions): void {
    if (TestQueue.mock) TestQueue.mock(item.name, queue, item.payload, options)
  }

  public dequeue(_queue: string): JobItem {
    return
  }
}
