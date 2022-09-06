import BaseJob from '../../../src/BaseJob'

export default class GoodJob extends BaseJob {
  public static performJestFn = jest.fn()

  public async perform(payload: Record<string, any>): Promise<void> {
    GoodJob.performJestFn(payload)
  }
}
