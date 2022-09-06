import BaseJob from '../../../src/BaseJob'

export default class PriorityBJob extends BaseJob {
  public static performJestFn = jest.fn()

  public static queue = 'high'

  public async perform(payload: Record<string, any>): Promise<void> {
    PriorityBJob.performJestFn(payload)
  }
}
