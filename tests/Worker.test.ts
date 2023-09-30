import { Measurement, sleep } from '@universal-packages/time-measurer'

import { Worker } from '../src'
import MemoryQueue from '../src/MemoryQueue'
import TestQueue from '../src/TestQueue'
import FailingJob from './__fixtures__/failing/Failing.job'
import ExcellentJob from './__fixtures__/jobs/Excellent.job'
import ExtraEmail from './__fixtures__/jobs/Extra.email'
import GoodJob from './__fixtures__/jobs/Good.job'
import PriorityAJob from './__fixtures__/priority/PriorityA.job'
import PriorityBJob from './__fixtures__/priority/PriorityB.job'
import ScheduledJob from './__fixtures__/schedule/Scheduled.job'

describe(Worker, (): void => {
  it('loads jobs and enable them to enqueue jobs for later and process them via worker', async (): Promise<void> => {
    const performedMock = jest.fn()
    const worker = new Worker({ jobsLocation: './tests/__fixtures__/jobs', queue: 'memory', waitTimeIfEmptyRound: 0 })

    await worker.prepare()
    await worker.queue.clear()

    worker.on('performed', performedMock)

    await GoodJob.performLater({ good: true })
    await ExcellentJob.performLater({ excellent: true })

    await worker.run()

    await sleep(200)

    await worker.stop()
    await worker.release()

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

  it('loads additional jobs extensions that may want to work as background jobs', async (): Promise<void> => {
    const performedMock = jest.fn()
    const worker = new Worker({
      additional: [{ conventionPrefix: 'email' }],
      queue: 'memory',
      jobsLocation: './tests/__fixtures__/jobs',
      waitTimeIfEmptyRound: 0
    })

    await worker.prepare()
    await worker.queue.clear()

    worker.on('performed', performedMock)

    await ExtraEmail.performLater({ extra: true })

    await worker.run()

    await sleep(200)

    await worker.stop()
    await worker.release()

    expect(performedMock.mock.calls).toEqual([
      [
        {
          event: 'performed',
          measurement: expect.any(Measurement),
          payload: {
            jobItem: {
              payload: {
                extra: true
              },
              srcFile: expect.stringMatching(/__fixtures__\/jobs\/Extra.email.ts/),
              name: 'ExtraEmail',
              maxRetries: 5,
              queue: 'email',
              retryAfter: '1 minute'
            }
          }
        }
      ]
    ])

    expect(GoodJob.performJestFn).toHaveBeenCalledWith({ good: true })
    expect(ExcellentJob.performJestFn).toHaveBeenCalledWith({ excellent: true })
  })

  it('prioritize by follow a queue property object', async (): Promise<void> => {
    const performedMock = jest.fn()
    const worker = new Worker({ jobsLocation: './tests/__fixtures__/priority', queue: 'memory', waitTimeIfEmptyRound: 0, queuePriority: { low: 1, high: 3 } })

    await worker.prepare()
    await worker.queue.clear()

    worker.on('performed', performedMock)

    await PriorityAJob.performLater({ A: true })
    await PriorityAJob.performLater({ A: true })
    await PriorityAJob.performLater({ A: true })
    await PriorityBJob.performLater({ B: true })
    await PriorityBJob.performLater({ B: true })
    await PriorityBJob.performLater({ B: true })
    await PriorityBJob.performLater({ B: true })

    await worker.run()

    await sleep(1000)

    await worker.stop()
    await worker.release()

    expect(performedMock.mock.calls).toEqual([
      [
        {
          event: 'performed',
          measurement: expect.any(Measurement),
          payload: { jobItem: expect.objectContaining({ name: 'PriorityAJob' }) }
        }
      ],
      [
        {
          event: 'performed',
          measurement: expect.any(Measurement),
          payload: { jobItem: expect.objectContaining({ name: 'PriorityBJob' }) }
        }
      ],
      [
        {
          event: 'performed',
          measurement: expect.any(Measurement),
          payload: { jobItem: expect.objectContaining({ name: 'PriorityBJob' }) }
        }
      ],
      [
        {
          event: 'performed',
          measurement: expect.any(Measurement),
          payload: { jobItem: expect.objectContaining({ name: 'PriorityBJob' }) }
        }
      ],
      [
        {
          event: 'performed',
          measurement: expect.any(Measurement),
          payload: { jobItem: expect.objectContaining({ name: 'PriorityAJob' }) }
        }
      ],
      [
        {
          event: 'performed',
          measurement: expect.any(Measurement),
          payload: { jobItem: expect.objectContaining({ name: 'PriorityBJob' }) }
        }
      ],
      [
        {
          event: 'performed',
          measurement: expect.any(Measurement),
          payload: { jobItem: expect.objectContaining({ name: 'PriorityAJob' }) }
        }
      ]
    ])
  })

  it('retries if a job fails as per configured', async (): Promise<void> => {
    const retryMock = jest.fn()
    const failedMock = jest.fn()
    const worker = new Worker({ jobsLocation: './tests/__fixtures__/failing', queue: 'memory', waitTimeIfEmptyRound: 0 })

    await worker.prepare()
    await worker.queue.clear()

    worker.on('retry', retryMock)
    worker.on('failed', failedMock)

    await FailingJob.performLater()

    await worker.run()

    await sleep(3500)

    await worker.stop()
    await worker.release()

    expect(retryMock.mock.calls).toEqual([
      [
        {
          event: 'retry',
          measurement: expect.any(Measurement),
          payload: {
            jobItem: expect.objectContaining({
              name: 'FailingJob',
              maxRetries: 3,
              queue: 'default',
              retryAfter: '1 second',
              error: {
                message: 'Job "perform" method not implemented',
                stack: expect.any(String)
              },
              retries: 1
            })
          }
        }
      ],
      [
        {
          event: 'retry',
          measurement: expect.any(Measurement),
          payload: {
            jobItem: expect.objectContaining({
              name: 'FailingJob',
              maxRetries: 3,
              queue: 'default',
              retryAfter: '1 second',
              error: {
                message: 'Job "perform" method not implemented',
                stack: expect.any(String)
              },
              retries: 2
            })
          }
        }
      ],
      [
        {
          event: 'retry',
          measurement: expect.any(Measurement),
          payload: {
            jobItem: expect.objectContaining({
              name: 'FailingJob',
              maxRetries: 3,
              queue: 'default',
              retryAfter: '1 second',
              error: {
                message: 'Job "perform" method not implemented',
                stack: expect.any(String)
              },
              retries: 3
            })
          }
        }
      ]
    ])
    expect(failedMock.mock.calls).toEqual([
      [
        {
          event: 'failed',
          measurement: expect.any(Measurement),
          payload: {
            jobItem: expect.objectContaining({
              name: 'FailingJob',
              maxRetries: 3,
              queue: 'default',
              retryAfter: '1 second',
              error: {
                message: 'Job "perform" method not implemented',
                stack: expect.any(String)
              },
              retries: 3
            })
          }
        }
      ]
    ])
  })

  it('schedules the job if self configured', async (): Promise<void> => {
    const worker = new Worker({ jobsLocation: './tests/__fixtures__/schedule', queue: 'memory', waitTimeIfEmptyRound: 0 })

    await worker.prepare()
    await worker.queue.clear()

    await worker.run()

    await sleep(1100)

    await worker.stop()
    await worker.release()

    expect(ScheduledJob.performJestFn).toHaveBeenCalled()
  })

  it('throws if a job has an error at loading', async (): Promise<void> => {
    let error: Error
    const worker = new Worker({ jobsLocation: './tests/__fixtures__/load-error', queue: 'memory', waitTimeIfEmptyRound: 0 })

    try {
      await worker.prepare()
      await worker.queue.clear()
    } catch (err) {
      error = err
    }

    await worker.release()

    expect(error).toEqual('Error')
  })

  it('Sets adapters from string', async (): Promise<void> => {
    const worker = new Worker({ queue: 'memory' })

    expect(worker).toMatchObject({ queue: expect.any(MemoryQueue) })
  })

  it('Sets adapters from objects', async (): Promise<void> => {
    const queue = new TestQueue()
    const worker = new Worker({ queue })

    expect(worker).toMatchObject({ queue })
  })

  it('can test job enqueueing with a mock', async (): Promise<void> => {
    TestQueue.setMock(jest.fn())
    const worker = new Worker({ jobsLocation: './tests/__fixtures__/jobs' })

    await worker.prepare()
    await worker.queue.clear()

    await GoodJob.performLater({ good: true })
    await ExcellentJob.performLater({ excellent: true })

    await worker.stop()
    await worker.release()

    expect(TestQueue.mock).toHaveBeenCalledWith('GoodJob', 'default', { good: true }, undefined)
    expect(TestQueue.mock).toHaveBeenCalledWith('ExcellentJob', 'default', { excellent: true }, undefined)
  })
})