# Background Jobs

[![npm version](https://badge.fury.io/js/@universal-packages%2Fbackground-jobs.svg)](https://www.npmjs.com/package/@universal-packages/background-jobs)
[![Testing](https://github.com/universal-packages/universal-background-jobs/actions/workflows/testing.yml/badge.svg)](https://github.com/universal-packages/universal-background-jobs/actions/workflows/testing.yml)
[![codecov](https://codecov.io/gh/universal-packages/universal-background-jobs/branch/main/graph/badge.svg?token=CXPJSN8IGL)](https://codecov.io/gh/universal-packages/universal-background-jobs)

Redis queue background jobs enqueuer and worker processor.

## Install

```shell
npm install @universal-packages/background-jobs
npm install redis
```

# Jobs

Interface to use to prepare everything, this is preparing a redis queue to be used to store jobs and be retrieved later by the [Worker](#worker), internally prepare all job files to be able to enqueue themselves using the function `performLater`.

```js
import { Jobs } from '@universal-packages/background-jobs'
import DeleteFlaggedUsersJob from './src/jobs/DeleteFlaggedUsers.job'

const jobs = new Jobs({ identifier: 'app-jobs', jobsDirectory: './src/jobs' })

await jobs.prepare() // Connects redis queue and load jobs.

await DeleteFlagedUsersJob.performLater({ count: 10 }) // Enqueue job to be performed later

await jobs.release()
```

```js
// DeleteFlagedUsers.job.js|ts
import { BaseJob } from '@universal-packages/background-jobs'

export default class DeleteFlagedUsersJob extends BaseJob {
  async perform(params) {
    deleteFlaggedUsers(params.count)
  }
}
```

## Options

`Jobs` takes the same [options](https://github.com/redis/node-redis/blob/master/docs/client-configuration.md) as the redis client.

Additionally takes the following ones:

- `client` `RedisClient`
  If you already have a client working in your app you can pass the instance here to not connect another client inside the `RedisQueue` instance.
- `identifier` `String`
  This will be prepended to all redis keys used internally to handle the queue, so one can debug easier.
- `jobsDirectory` `String`
  Where all job files are, all files should prepend a `.job` prefix, ex: `Later.job.js`.

# BaseJob

Base interface to enable a JS class to be used as Job it will only require a perform function to behave correctly.

```js
import { BaseJob } from '@universal-packages/background-jobs'

export default class DeleteFlagedUsersJob extends BaseJob {
  static schedule = { cronTime: '* * * * * *', timeZone: 'America/Los_Angeles' }
  static maxRetries = 10
  static retryAfter = '10 minutes'
  static queue = 'important'

  async perform(params) {
    deleteFlagedUsers(params.count)
  }
}
```

## Static options

- `schedule` `{ cronTime: String, timeZone?: String }`
  If present the job will be enqueued using a cron, it requires a cronTime format string for cron to trigger the enqueueing.
- `maxRetries` `Number` `default: 5`
  If the job fails, how many times re-try to run it before failing once and for all.
- `retryAfter` `String` `default: 1 minute`
  How much time to wait before trying to run a job after a failure.
- `queue` `String` `default: default`
  Which queue use to enqueue this job, useful later when setting up the worker on how to prioritize queues.

# Worker

The `Worker` is what you use to run your enqueued jobs, it interfaces the same as `Jobs`, you can also use the `Worker` to prepare jobs and then start processing them.

```js
import { Worker } from '@universal-packages/background-jobs'
import DeleteFlagedUsersJob from './src/jobs/DeleteFlagedUsers.job'

const worker = new Worker({ identifier: 'app-jobs', jobsDirectory: './src/jobs', concurrentPerformers: 2, queuePriority: { important: 2 }, waitTimeIfEmptyRound: 10000 })

await worker.prepare() // Connects redis queue and load jobs.

await DeleteFlagedUsersJob.performLater({ count: 10 }) // Enqueue job to be performed later

await worker.run()

// DeleteFlagedUsersJob will be performed now

// When app going down
await worker.stop()
await worker.release()
```

## Options

`Worker` takes the same options as [Jobs](#jobs).

Additionally takes the following ones:

- `concurrentPerformers` `number` `default: 1`
  How many jobs at the same time should the instance perform at the same time, useful to not have multiple apps running the worker using their own memory.
- `queuePriority` `{ [queueName]: number }`
  Configure queues to have more priority over others, the higher number the higher the priority. ex: { important: 3 } in this case 3 important jobs will be processed for every default one.
- `waitTimeIfEmptyRound` `number` `default: 1000`
  In milliseconds how much to wait if there is nothing to perform, so the pulling is not so aggressive trying to get jobs to perform.

## Events

Events will be emitted while background jobs do its job ;).

### Jobs

Jobs will emit every time a job has been enqueued

```js
jobs.on('enqueued', ({ jobItem }) => console.log(jobItem))
```

### Worker

Worker will emit a series of events regarding the status of jobs being performed.

```js
jobs.on('performed', ({ jobItem, measurement }) => console.log(jobItem, measurement))
jobs.on('retry', ({ jobItem, measurement }) => console.log(jobItem, measurement))
jobs.on('failed', ({ jobItem, measurement }) => console.log(jobItem, measurement))
jobs.on('error', ({ error, jobItem }) => console.log(error, jobItem))
```

## Typescript

This library is developed in TypeScript and shipped fully typed.

## Contributing

The development of this library happens in the open on GitHub, and we are grateful to the community for contributing bugfixes and improvements. Read below to learn how you can take part in improving this library.

- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Contributing Guide](./CONTRIBUTING.md)

### License

[MIT licensed](./LICENSE).
