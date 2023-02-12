import { JobItem, LaterOptions, PerformLaterFunction } from './Jobs.types'

export default class BaseJob<P = Record<string, any>> {
  public static schedule?: { cronTime: string; timeZone?: string }
  public static maxRetries: number = 5
  public static retryAfter: string = '1 minute'
  public static queue: string = 'default'

  protected static __performLater: PerformLaterFunction
  protected static __srcFile: string

  public static async performLater<P = Record<string, any>>(payload?: P, options?: LaterOptions): Promise<void> {
    await new this().performLater(payload, options)
  }

  public async perform(_payload: P): Promise<void> {
    throw new Error('Job "perform" method not implemented')
  }

  public async performLater(payload?: P, options?: { at?: Date; wait?: string }): Promise<void> {
    const jobRecord: JobItem = {
      payload,
      srcFile: this.constructor['__srcFile'],
      name: this.constructor.name,
      maxRetries: this.constructor['maxRetries'],
      queue: this.constructor['queue'],
      retryAfter: this.constructor['retryAfter']
    }

    await this.constructor['__performLater'](jobRecord, options)
  }
}
