import { Measurement, sleep } from '@universal-packages/time-measurer'
import { Worker } from '../src'
import FailingJob from './__fixtures__/failing/Failing.job'
import ExelectJob from './__fixtures__/jobs/Excelent.job'
import GoodJob from './__fixtures__/jobs/Good.job'
import PriorityAJob from './__fixtures__/priority/PriorityA.job'
import PriorityBJob from './__fixtures__/priority/PriorityB.job'
import ScheduledJob from './__fixtures__/schedule/Scheduled.job'

describe('BackgroundJobs', (): void => {
  it('loads jobs and enable them to enqueue jobs for later and processthem via worker', async (): Promise<void> => {
    const perfomedMock = jest.fn()
    const worker = new Worker({ jobsDirectory: './tests/__fixtures__/jobs', waitTimeIfEmptyRound: 0 })

    await worker.prepare()
    await worker.redisQueue.clear()

    worker.on('performed', perfomedMock)

    await GoodJob.performLater({ good: true })
    await ExelectJob.performLater({ excelet: true })

    await worker.start()

    await sleep(200)

    await worker.stop()
    await worker.release()

    expect(perfomedMock.mock.calls).toEqual([
      [
        {
          jobItem: {
            payload: { good: true },
            srcFile: expect.stringMatching(/__fixtures__\/jobs\/Good.job.ts/),
            name: 'GoodJob',
            maxRetries: 5,
            queue: 'default',
            retryAfter: '1 minute'
          },
          measurement: expect.any(Measurement)
        }
      ],
      [
        {
          jobItem: {
            payload: { excelet: true },
            srcFile: expect.stringMatching(/__fixtures__\/jobs\/Excelent.job.ts/),
            name: 'ExelectJob',
            maxRetries: 5,
            queue: 'default',
            retryAfter: '1 minute'
          },
          measurement: expect.any(Measurement)
        }
      ]
    ])

    expect(GoodJob.performJestFn).toHaveBeenCalledWith({ good: true })
    expect(ExelectJob.performJestFn).toHaveBeenCalledWith({ excelet: true })
  })

  it('prioretize by follow a queue prorety object', async (): Promise<void> => {
    const perfomedMock = jest.fn()
    const worker = new Worker({ jobsDirectory: './tests/__fixtures__/priority', waitTimeIfEmptyRound: 0, queuePriority: { low: 1, high: 3 } })

    await worker.prepare()
    await worker.redisQueue.clear()

    worker.on('performed', perfomedMock)

    await PriorityAJob.performLater({ A: true })
    await PriorityAJob.performLater({ A: true })
    await PriorityAJob.performLater({ A: true })
    await PriorityBJob.performLater({ B: true })
    await PriorityBJob.performLater({ B: true })
    await PriorityBJob.performLater({ B: true })
    await PriorityBJob.performLater({ B: true })

    await worker.start()

    await sleep(1000)

    await worker.stop()
    await worker.release()

    expect(perfomedMock.mock.calls).toEqual([
      [{ jobItem: expect.objectContaining({ name: 'PriorityAJob' }), measurement: expect.any(Measurement) }],
      [{ jobItem: expect.objectContaining({ name: 'PriorityBJob' }), measurement: expect.any(Measurement) }],
      [{ jobItem: expect.objectContaining({ name: 'PriorityBJob' }), measurement: expect.any(Measurement) }],
      [{ jobItem: expect.objectContaining({ name: 'PriorityBJob' }), measurement: expect.any(Measurement) }],
      [{ jobItem: expect.objectContaining({ name: 'PriorityAJob' }), measurement: expect.any(Measurement) }],
      [{ jobItem: expect.objectContaining({ name: 'PriorityBJob' }), measurement: expect.any(Measurement) }],
      [{ jobItem: expect.objectContaining({ name: 'PriorityAJob' }), measurement: expect.any(Measurement) }]
    ])
  })

  it('retries if a job fails as per configured', async (): Promise<void> => {
    const retryMock = jest.fn()
    const failedMock = jest.fn()
    const worker = new Worker({ jobsDirectory: './tests/__fixtures__/failing', waitTimeIfEmptyRound: 0 })

    await worker.prepare()
    await worker.redisQueue.clear()

    worker.on('retry', retryMock)
    worker.on('failed', failedMock)

    await FailingJob.performLater()

    await worker.start()

    await sleep(3500)

    await worker.stop()
    await worker.release()

    expect(retryMock.mock.calls).toEqual([
      [
        {
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
          }),
          measurement: expect.any(Measurement)
        }
      ],
      [
        {
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
          }),
          measurement: expect.any(Measurement)
        }
      ],
      [
        {
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
          }),
          measurement: expect.any(Measurement)
        }
      ]
    ])
    expect(failedMock.mock.calls).toEqual([
      [
        {
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
          }),
          measurement: expect.any(Measurement)
        }
      ]
    ])
  })

  it('schedules the job if self configured', async (): Promise<void> => {
    const worker = new Worker({ jobsDirectory: './tests/__fixtures__/schedule', waitTimeIfEmptyRound: 0 })

    await worker.prepare()
    await worker.redisQueue.clear()

    await worker.start()

    await sleep(1100)

    await worker.stop()
    await worker.release()

    expect(ScheduledJob.performJestFn).toHaveBeenCalled()
  })

  it('throws if a job has an error at loading', async (): Promise<void> => {
    let error: Error
    const worker = new Worker({ jobsDirectory: './tests/__fixtures__/load-error', waitTimeIfEmptyRound: 0 })

    try {
      await worker.prepare()
      await worker.redisQueue.clear()
    } catch (err) {
      error = err
    }

    await worker.release()

    expect(error).toEqual('Error')
  })
})
