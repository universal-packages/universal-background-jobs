import BaseJob from '../../../src/BaseJob'

export default class FailingJob extends BaseJob {
  public static retryAfter = '1 second'
  public static maxRetries = 3
}
