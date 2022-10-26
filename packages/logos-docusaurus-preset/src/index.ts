import { PluginOptions as SearchPluginOptions } from '@acid-info/logos-docusaurus-search-local/src'
import classicPreset from '@docusaurus/preset-classic'
import type { LoadContext, PluginConfig, Preset } from '@docusaurus/types'
import _ from 'lodash'
import * as path from 'path'
import { siteConfigs } from './site-config/index'
import { themeConfigs } from './theme-config/index'
import { PluginOptions, ThemeNames } from './types'
import { findDocInstances, validateDocPluginOptions } from './utils/docs.utils'

const addSearchPlugin = (
  plugins: PluginConfig[],
  options: PluginOptions,
): PluginConfig[] => {
  const docs = findDocInstances(plugins).map((plugin) =>
    validateDocPluginOptions(plugin![1]),
  )

  return [
    [
      '@acid-info/logos-docusaurus-search-local',
      {
        hashed: true,
        indexDocs: true,
        indexBlog: false,
        indexPages: true,
        docsDir: docs.map((doc) => doc.path),
        searchContextByPaths: docs.map((doc) => doc.path),
        docsRouteBasePath: docs.map((doc) => doc.routeBasePath),
      } as Partial<SearchPluginOptions>,
    ],
  ]
}

export default function logosPreset(
  context: LoadContext,
  options: PluginOptions,
): Preset {
  context.siteConfig.staticDirectories.push(
    path.join(__dirname, '../static/common'),
    path.join(__dirname, '../static', options.businessUnit),
  )

  context.siteConfig = _.merge(
    context.siteConfig,
    siteConfigs[options.businessUnit],
  )

  context.siteConfig.themeConfig = themeConfigs[options.businessUnit]

  const { plugins = [], themes = [] } = classicPreset(context, {
    docs: {
      routeBasePath: '/',
    },
    theme: {},
  })

  plugins.push('docusaurus-plugin-sass')
  plugins.push(
    ...addSearchPlugin([...context.siteConfig.plugins, ...plugins], options),
  )

  if (options.theme?.name === ThemeNames.Default)
    themes.push([
      '@acid-info/logos-docusaurus-theme',
      options.theme?.options ?? {},
    ])

  return {
    plugins,
    themes,
  }
}

export * from './types'
export { validateOptions } from './validateOptions'
