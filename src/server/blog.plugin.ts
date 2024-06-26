import {
  BlogContent,
  PluginOptions as BlogPluginOptions,
} from '@docusaurus/plugin-content-blog'
import { LoadedPlugin, Props } from '@docusaurus/types'
import * as fs from 'fs'
import * as path from 'path'
import { Document } from './document'
import { ImageGenerator } from './imageGenerator'
import { BlogPageData } from './types/blog.types'
import { ImageRenderer } from './types/image.types'
import { PluginOptions } from './types/plugin.types'
import logger from '@docusaurus/logger'
import * as progress from './progress';

export class BlogPlugin {
  static plugin = 'docusaurus-plugin-content-blog'

  pages: Omit<BlogPageData, 'document'>[] = []

  constructor(
    private context: Props,
    private options: PluginOptions,
    private imageGenerator: ImageGenerator,
    private imageRenderer: ImageRenderer,
  ) {}

  process = async () => {
    await this.loadData()
    await this.generate()
  }

  loadData = async () => {
    const plugins = this.context.plugins.filter(
      (plugin) => plugin.name === BlogPlugin.plugin,
    )

    for (const plugin of plugins) {
      await this.loadInstance(plugin)
    }
  }

  loadInstance = async (plugin: LoadedPlugin) => {
    const content = plugin.content as BlogContent
    const options = plugin.options as BlogPluginOptions

    content.blogListPaginated.forEach((value) => {
      this.pages.push({
        data: value,
        plugin: options,
        pageType: 'list',
        permalink: value.metadata.permalink,
      })
    })

    content.blogPosts.forEach((post) => {
      this.pages.push({
        data: post,
        plugin: options,
        pageType: 'post',
        permalink: post.metadata.permalink,
      })
    })

    if (content.blogTagsListPath) {
      const filePath = this.getHtmlPath(content.blogTagsListPath)

      fs.existsSync(filePath) &&
        this.pages.push({
          pageType: 'tags',
          plugin: options,
          data: {
            permalink: content.blogTagsListPath,
          },
          permalink: content.blogTagsListPath,
        })
    }

    if (options.archiveBasePath) {
      const permalink = path.join(
        '/',
        options.routeBasePath,
        options.archiveBasePath,
      )

      fs.existsSync(this.getHtmlPath(permalink)) &&
        this.pages.push({
          plugin: options,
          pageType: 'archive',
          data: { permalink: permalink },
          permalink,
        })
    }

    {
      Object.entries(content.blogTags).map(([key, value]) => {
        value.pages.forEach((page) => {
          this.pages.push({
            pageType: 'tag',
            plugin: options,
            data: { ...page.metadata, label: value.label },
            permalink: page.metadata.permalink,
          })
        })
      })
    }
  }

  generate = async () => {
    logger.info(`Generating og images for ${this.pages.length} blog pages`)
    const bar = progress.defaultBar()
    bar.start(this.pages.length, 0, {prefix: 'rendering images', suffix: '-'})
    for (const page of this.pages) {
      const document = new Document(this.getHtmlPath(page.permalink))
      bar.update({ suffix: page.permalink })

      await document.load()
      if (!document.loaded) {
        bar.increment()
        continue
      }

      const image = await this.imageRenderer(
        {
          ...page,
          document,
          websiteOutDir: this.context.outDir,
        },
        this.context,
      )

      if (!image) {
        await document.write()
        bar.increment()
        continue
      }

      const generated = await this.imageGenerator.generate(...image)

      await document.setImage(generated.url)

      await document.write()
      bar.increment()
    }
    bar.stop()
    
    logger.success('Generated og images for blog pages')
  }

  getHtmlPath = (permalink: string, baseUrl?: string) =>
    path.join(this.stripLangFromPath(this.context.outDir), permalink, 'index.html')
  stripLangFromPath = (path: string) => {
    const lang = this.context.i18n.locales.find((locale) => path.endsWith(`/${locale}`))
    return lang ? path.slice(0, -lang.length - 1) : path
  }
}
