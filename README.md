# Background Jobs

[![npm version](https://badge.fury.io/js/@universal-packages%2Fbackground-jobs.svg)](https://www.npmjs.com/package/@universal-packages/background-jobs)
[![Testing](https://github.com/universal-packages/universal-background-jobs/actions/workflows/testing.yml/badge.svg)](https://github.com/universal-packages/universal-background-jobs/actions/workflows/testing.yml)
[![codecov](https://codecov.io/gh/universal-packages/universal-background-jobs/branch/main/graph/badge.svg?token=CXPJSN8IGL)](https://codecov.io/gh/universal-packages/universal-background-jobs)

Redis queue background jobs enqueuer and jobs processor.

## Install

```shell
npm install @universal-packages/background-jobs
```

## Jobs

Interface to use to prepare everything, this is preparing the queue to be used to store jobs and be retrieved later, internally prepare all job files to be able to enqueue themselves using the function `performLater`.

```js
import { Jobs } from '@universal-packages/background-jobs'

import DeleteFlaggedUsersJob from './src/jobs/DeleteFlaggedUsers.job'

const jobs = new Jobs({ identifier: 'app-jobs', jobsLocation: './src/jobs', concurrentPerformers: 2, queuePriority: { important: 2 }, waitTimeIfEmptyRound: 10000 })

await jobs.prepare()

await DeleteFlaggedUsersJob.performLater({ count: 10 }) // Enqueue job to be performed later

await jobs.run()

// DeleteFlaggedUsersJob will be performed now

// When app going down
await jobs.stop()
await jobs.release()
```

```js
// DeleteFlaggedUsers.job.js|ts
import { BaseJob } from '@universal-packages/background-jobs'

export default class DeleteFlaggedUsersJob extends BaseJob {
  async perform(params) {
    deleteFlaggedUsers(params.count)
  }
}
```

### Options

- **`concurrentPerformers`** `number` `default: 1`
  How many jobs at the same time should the instance perform at the same time, useful to not have multiple apps running the jobs using their own memory.
- **`jobsLocation`** `String`
  Where all job files are, all files should prepend a `.job` prefix, ex: `Later.job.js`.
- **`loaders`** `Object`
  Loaders to load additional Job-like classes that may want to work as a Job but with additional functionality, ex: `My.email.js`.
- **`loaderOptions`** `Object`
  Any options that a loader that is loaded via adapters (automatically based on its package name) may use to configure its loaded jobs. Named as the loader class name in any format for example `EmailLoader` could be `EmailLoader`, `email_loader` or `email`.

  ```js
  const jobs = new Jobs({
    loaderOptions: {
      email: {
        engine: 'sendgrid'
      }
    }
  })
  ```

- **`queue`** `string | QueueInterface` `Default: memory | test`
  Queue to use to enqueue jobs, by default if NODE_ENV is development memory(not recommended for production) will be used, if NODE_ENV is test the the test queue will be used.
- **`queueOptions`** `Object`
  Any options that the queue constructor accepts
- **`queuePriority`** `{ [queueName]: number }`
  Configure queues to have more priority over others, the higher number the higher the priority. ex: { important: 3 } in this case 3 important jobs will be processed for every default one.
- **`waitTimeIfEmptyRound`** `number` `default: 1000`
  In milliseconds how much to wait if there is nothing to perform, so the pulling is not so aggressive trying to get jobs to perform.

### Instance methods

#### **`prepare`**

Loads all jobs and prepares the queue engine.

#### **`release`**

Releases the queue engine.

#### **`run`**

Start dequeuing jobs and preform them.

#### **`stop`**

Stops performing jobs.

### Events

Jobs will emit every time a job has been enqueued

```js
jobs.on('*', (event) => console.log(event))
jobs.on('enqueued', (event) => console.log(event))
jobs.on('performed', (event) => console.log(event))
jobs.on('retry', (event) => console.log(event))
jobs.on('failed', (event) => console.log(event))
jobs.on('error', (event) => console.log(event))
```

## BaseJob

Base interface to enable a JS class to be used as Job it will only require a perform function to behave correctly.

```js
import { BaseJob } from '@universal-packages/background-jobs'

export default class DeleteFlaggedUsersJob extends BaseJob {
  static schedule = { cronTime: '* * * * * *', timeZone: 'America/Los_Angeles' }
  static maxRetries = 10
  static retryAfter = '10 minutes'
  static queue = 'important'

  async perform(params) {
    deleteFlaggedUsers(params.count)
  }
}
```

### Static properties

#### **`schedule`** `{ cronTime: String, timeZone?: String }`

If present the job will be enqueued using a cron, it requires a cronTime format string for cron to trigger the enqueueing.

#### **`maxRetries`** `Number` `default: 5`

If the job fails, how many times re-try to run it before failing once and for all.

#### **`retryAfter`** `String` `default: 1 minute`

How much time to wait before trying to run a job after a failure.

#### **`queue`** `String` `default: default`

Which queue use to enqueue this job, useful later when setting up the jobs on how to prioritize queues.

## BaseLoader

Base interface to load additional Job-like classes that may want to work as a Job but with additional functionality, ex: `My.email.js`.

```js
import { BaseLoader } from '@universal-packages/background-jobs'

export default class EmailLoader extends BaseLoader {
  static conventionPrefix = 'email'

  async prepare() {
    await this.loadJobs()

    const emailClasses = Object.values(this.jobsCollection)

    for (const emailClass of emailClasses) {
      emailClass['loaded'] = true
    }
  }
}
```

### Static properties

#### **`conventionPrefix`** `String`

Prefix to use to load the classes, ex: `email` will load all classes that are prefixed before the extension with `email`, ex: `Welcome.email.js`.

### Instance properties

#### **`jobsCollection`** `Object`

Collection of all jobs loaded with `await this.loadJobs()` using the convention prefix.

### Instance methods

#### **`prepare()`**

Override this method to add additional functionality to the loaded jobs. You should always call `await this.loadJobs()` to load the jobs.

#### **`release()`**

Override this method in case your loader needs to release any resources from the jobs.

## Typescript

This library is developed in TypeScript and shipped fully typed.

## Contributing

The development of this library happens in the open on GitHub, and we are grateful to the community for contributing bugfixes and improvements. Read below to learn how you can take part in improving this library.

- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Contributing Guide](./CONTRIBUTING.md)

### License

[MIT licensed](./LICENSE).
