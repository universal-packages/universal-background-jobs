import { Measurement, sleep } from '@universal-packages/time-measurer'

import { Jobs } from '../src'
import BaseLoader from '../src/BaseLoader'
import MemoryQueue from '../src/MemoryQueue'
import TestQueue from '../src/TestQueue'
import FailingJob from './__fixtures__/failing/Failing.job'
import ExcellentJob from './__fixtures__/jobs/Excellent.job'
import ExtraEmail from './__fixtures__/jobs/Extra.email'
import GoodJob from './__fixtures__/jobs/Good.job'
import PriorityAJob from './__fixtures__/priority/PriorityA.job'
import PriorityBJob from './__fixtures__/priority/PriorityB.job'
import ScheduledJob from './__fixtures__/schedule/Scheduled.job'

describe(Jobs, (): void => {
  it('loads jobs and enable them to enqueue jobs for later and process them via jobs', async (): Promise<void> => {
    const performedMock = jest.fn()
    const jobs = new Jobs({ jobsLocation: './tests/__fixtures__/jobs', queue: 'memory', waitTimeIfEmptyRound: 0 })

    await jobs.prepare()
    await jobs.queue.clear()

    jobs.on('performed', performedMock)

    await GoodJob.performLater({ good: true })
    await ExcellentJob.performLater({ excellent: true })

    await jobs.run()

    await sleep(200)

    await jobs.stop()
    await jobs.release()

    expect(performedMock.mock.calls).toEqual([
      [
        {
          event: 'performed',
          measurement: expect.any(Measurement),
          payload: {
            jobItem: {
              payload: {
                good: true
              },
              srcFile: expect.stringMatching(/__fixtures__\/jobs\/Good.job.ts/),
              name: 'GoodJob',
              maxRetries: 5,
              queue: 'default',
              retryAfter: '1 minute'
            }
          }
        }
      ],
      [
        {
          event: 'performed',
          measurement: expect.any(Measurement),
          payload: {
            jobItem: {
              payload: {
                excellent: true
              },
              srcFile: expect.stringMatching(/__fixtures__\/jobs\/Excellent.job.ts/),
              name: 'ExcellentJob',
              maxRetries: 5,
              queue: 'default',
              retryAfter: '1 minute'
            }
          }
        }
      ]
    ])

    expect(GoodJob.performJestFn).toHaveBeenCalledWith({ good: true })
    expect(ExcellentJob.performJestFn).toHaveBeenCalledWith({ excellent: true })
  })

  // it('loads additional jobs extensions that may want to work as background jobs throw loaders', async (): Promise<void> => {
  //   const performedMock = jest.fn()

  //   class EmailLoader extends BaseLoader {
  //     public static readonly conventionPrefix: string = 'email'
  //   }

  //   const jobs = new Jobs({
  //     loaders: [EmailLoader],
  //     queue: 'memory',
  //     jobsLocation: './tests/__fixtures__/jobs',
  //     waitTimeIfEmptyRound: 0
  //   })

  //   await jobs.prepare()
  //   await jobs.queue.clear()

  //   jobs.on('performed', performedMock)

  //   await ExtraEmail.performLater({ extra: true })

  //   await jobs.run()

  //   await sleep(200)

  //   await jobs.stop()
  //   await jobs.release()

  //   expect(performedMock.mock.calls).toEqual([
  //     [
  //       {
  //         event: 'performed',
  //         measurement: expect.any(Measurement),
  //         payload: {
  //           jobItem: {
  //             payload: {
  //               extra: true
  //             },
  //             srcFile: expect.stringMatching(/__fixtures__\/jobs\/Extra.email.ts/),
  //             name: 'ExtraEmail',
  //             maxRetries: 5,
  //             queue: 'email',
  //             retryAfter: '1 minute'
  //           }
  //         }
  //       }
  //     ]
  //   ])

  //   expect(GoodJob.performJestFn).toHaveBeenCalledWith({ good: true })
  //   expect(ExcellentJob.performJestFn).toHaveBeenCalledWith({ excellent: true })
  // })

  // it('prioritize by follow a queue property object', async (): Promise<void> => {
  //   const performedMock = jest.fn()
  //   const jobs = new Jobs({ jobsLocation: './tests/__fixtures__/priority', queue: 'memory', waitTimeIfEmptyRound: 0, queuePriority: { low: 1, high: 3 } })

  //   await jobs.prepare()
  //   await jobs.queue.clear()

  //   jobs.on('performed', performedMock)

  //   await PriorityAJob.performLater({ A: true })
  //   await PriorityAJob.performLater({ A: true })
  //   await PriorityAJob.performLater({ A: true })
  //   await PriorityBJob.performLater({ B: true })
  //   await PriorityBJob.performLater({ B: true })
  //   await PriorityBJob.performLater({ B: true })
  //   await PriorityBJob.performLater({ B: true })

  //   await jobs.run()

  //   await sleep(1000)

  //   await jobs.stop()
  //   await jobs.release()

  //   expect(performedMock.mock.calls).toEqual([
  //     [
  //       {
  //         event: 'performed',
  //         measurement: expect.any(Measurement),
  //         payload: { jobItem: expect.objectContaining({ name: 'PriorityAJob' }) }
  //       }
  //     ],
  //     [
  //       {
  //         event: 'performed',
  //         measurement: expect.any(Measurement),
  //         payload: { jobItem: expect.objectContaining({ name: 'PriorityBJob' }) }
  //       }
  //     ],
  //     [
  //       {
  //         event: 'performed',
  //         measurement: expect.any(Measurement),
  //         payload: { jobItem: expect.objectContaining({ name: 'PriorityBJob' }) }
  //       }
  //     ],
  //     [
  //       {
  //         event: 'performed',
  //         measurement: expect.any(Measurement),
  //         payload: { jobItem: expect.objectContaining({ name: 'PriorityBJob' }) }
  //       }
  //     ],
  //     [
  //       {
  //         event: 'performed',
  //         measurement: expect.any(Measurement),
  //         payload: { jobItem: expect.objectContaining({ name: 'PriorityAJob' }) }
  //       }
  //     ],
  //     [
  //       {
  //         event: 'performed',
  //         measurement: expect.any(Measurement),
  //         payload: { jobItem: expect.objectContaining({ name: 'PriorityBJob' }) }
  //       }
  //     ],
  //     [
  //       {
  //         event: 'performed',
  //         measurement: expect.any(Measurement),
  //         payload: { jobItem: expect.objectContaining({ name: 'PriorityAJob' }) }
  //       }
  //     ]
  //   ])
  // })

  // it('retries if a job fails as per configured', async (): Promise<void> => {
  //   const retryMock = jest.fn()
  //   const failedMock = jest.fn()
  //   const jobs = new Jobs({ jobsLocation: './tests/__fixtures__/failing', queue: 'memory', waitTimeIfEmptyRound: 0 })

  //   await jobs.prepare()
  //   await jobs.queue.clear()

  //   jobs.on('retry', retryMock)
  //   jobs.on('failed', failedMock)

  //   await FailingJob.performLater()

  //   await jobs.run()

  //   await sleep(3500)

  //   await jobs.stop()
  //   await jobs.release()

  //   expect(retryMock.mock.calls).toEqual([
  //     [
  //       {
  //         event: 'retry',
  //         measurement: expect.any(Measurement),
  //         payload: {
  //           jobItem: expect.objectContaining({
  //             name: 'FailingJob',
  //             maxRetries: 3,
  //             queue: 'default',
  //             retryAfter: '1 second',
  //             error: {
  //               message: 'Job "perform" method not implemented',
  //               stack: expect.any(String)
  //             },
  //             retries: 1
  //           })
  //         }
  //       }
  //     ],
  //     [
  //       {
  //         event: 'retry',
  //         measurement: expect.any(Measurement),
  //         payload: {
  //           jobItem: expect.objectContaining({
  //             name: 'FailingJob',
  //             maxRetries: 3,
  //             queue: 'default',
  //             retryAfter: '1 second',
  //             error: {
  //               message: 'Job "perform" method not implemented',
  //               stack: expect.any(String)
  //             },
  //             retries: 2
  //           })
  //         }
  //       }
  //     ],
  //     [
  //       {
  //         event: 'retry',
  //         measurement: expect.any(Measurement),
  //         payload: {
  //           jobItem: expect.objectContaining({
  //             name: 'FailingJob',
  //             maxRetries: 3,
  //             queue: 'default',
  //             retryAfter: '1 second',
  //             error: {
  //               message: 'Job "perform" method not implemented',
  //               stack: expect.any(String)
  //             },
  //             retries: 3
  //           })
  //         }
  //       }
  //     ]
  //   ])
  //   expect(failedMock.mock.calls).toEqual([
  //     [
  //       {
  //         event: 'failed',
  //         measurement: expect.any(Measurement),
  //         payload: {
  //           jobItem: expect.objectContaining({
  //             name: 'FailingJob',
  //             maxRetries: 3,
  //             queue: 'default',
  //             retryAfter: '1 second',
  //             error: {
  //               message: 'Job "perform" method not implemented',
  //               stack: expect.any(String)
  //             },
  //             retries: 3
  //           })
  //         }
  //       }
  //     ]
  //   ])
  // })

  // it('schedules the job if self configured', async (): Promise<void> => {
  //   const jobs = new Jobs({ jobsLocation: './tests/__fixtures__/schedule', queue: 'memory', waitTimeIfEmptyRound: 0 })

  //   await jobs.prepare()
  //   await jobs.queue.clear()

  //   await jobs.run()

  //   await sleep(1100)

  //   await jobs.stop()
  //   await jobs.release()

  //   expect(ScheduledJob.performJestFn).toHaveBeenCalled()
  // })

  // it('throws if a job has an error at loading', async (): Promise<void> => {
  //   let error: Error
  //   const jobs = new Jobs({ jobsLocation: './tests/__fixtures__/load-error', queue: 'memory', waitTimeIfEmptyRound: 0 })

  //   try {
  //     await jobs.prepare()
  //     await jobs.queue.clear()
  //   } catch (err) {
  //     error = err
  //   }

  //   await jobs.release()

  //   expect(error).toEqual('Error')
  // })

  // it('Sets adapters from string', async (): Promise<void> => {
  //   const jobs = new Jobs({ queue: 'memory' })

  //   expect(jobs).toMatchObject({ queue: expect.any(MemoryQueue) })
  // })

  // it('Sets adapters from objects', async (): Promise<void> => {
  //   const queue = new TestQueue()
  //   const jobs = new Jobs({ queue })

  //   expect(jobs).toMatchObject({ queue })
  // })

  // it('can test job enqueueing with a mock', async (): Promise<void> => {
  //   TestQueue.setMock(jest.fn())
  //   const jobs = new Jobs({ jobsLocation: './tests/__fixtures__/jobs' })

  //   await jobs.prepare()
  //   await jobs.queue.clear()

  //   await GoodJob.performLater({ good: true })
  //   await ExcellentJob.performLater({ excellent: true })

  //   await jobs.stop()
  //   await jobs.release()

  //   expect(TestQueue.mock).toHaveBeenCalledWith('GoodJob', 'default', { good: true }, undefined)
  //   expect(TestQueue.mock).toHaveBeenCalledWith('ExcellentJob', 'default', { excellent: true }, undefined)
  // })
})
