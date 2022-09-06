import BaseJob from '../../../src/BaseJob'

export default class ExelectJob extends BaseJob {
  public static performJestFn = jest.fn()

  public async perform(payload: Record<string, any>): Promise<void> {
    ExelectJob.performJestFn(payload)
  }
}
