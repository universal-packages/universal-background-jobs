import { JobItem, PerfromLaterFunction } from './Jobs.types'

export default class BaseJob<P = Record<string, any>> {
  public static schedule?: { cronTime: string; timeZone?: string }
  public static maxRetries: number = 5
  public static retryAfter: string = '1 minute'
  public static queue: string = 'default'

  protected static __performLater: PerfromLaterFunction
  protected static __srcFile: string

  public static async performLater<P = Record<string, any>>(payload?: P, options?: { at?: Date; wait?: string }): Promise<void> {
    const jobRecord: JobItem = {
      payload,
      srcFile: this.__srcFile,
      name: this.name,
      maxRetries: this.maxRetries,
      queue: this.queue,
      retryAfter: this.retryAfter
    }

    await this.__performLater(jobRecord, options)
  }

  public async perform<Pa = P>(_payload: Pa): Promise<void> {
    throw new Error('Job "perform" method not implemented')
  }
}
