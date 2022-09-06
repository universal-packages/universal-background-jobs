import BaseJob from '../../../src/BaseJob'

export default class ScheduledJob extends BaseJob {
  public static schedule = { cronTime: '* * * * * *' }
  public static performJestFn = jest.fn()

  public async perform(payload: Record<string, any>): Promise<void> {
    ScheduledJob.performJestFn(payload)
  }
}
