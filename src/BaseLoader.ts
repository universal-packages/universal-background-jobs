import { loadModules } from '@universal-packages/module-loader'

import BaseJob from './BaseJob'
import { LoaderOptions } from './BackgroundJobs.types'

export default class BaseLoader {
  public static readonly conventionPrefix: string = 'job'

  public readonly options: LoaderOptions
  public readonly jobsCollection: Record<string, typeof BaseJob> = {}
  public readonly queueNames: Set<string> = new Set()

  public constructor(options: LoaderOptions) {
    this.options = options
  }

  public async prepare(): Promise<void> {
    await this.loadJobs()
  }

  public async release(): Promise<void> {
    // Only if a special loader need to release something if not do nothings
  }

  protected async loadJobs(): Promise<void> {
    const modules = await loadModules(this.options.jobsLocation, { conventionPrefix: this.constructor['conventionPrefix'] })

    for (let i = 0; i < modules.length; i++) {
      const currentModule = modules[i]

      if (currentModule.error) {
        throw currentModule.error
      } else {
        const Job: typeof BaseJob = currentModule.exports
        this.jobsCollection[Job.name] = currentModule.exports
        this.queueNames.add(Job.queue)

        Job['__performLater'] = this.options.performLater
        Job['__srcFile'] = currentModule.location
      }
    }
  }
}
