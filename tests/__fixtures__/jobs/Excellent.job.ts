import BaseJob from '../../../src/BaseJob'

export default class ExcellentJob extends BaseJob {
  public static performJestFn = jest.fn()

  public async perform(payload: Record<string, any>): Promise<void> {
    ExcellentJob.performJestFn(payload)
  }
}
