import { useActivePluginAndVersion } from '@docusaurus/plugin-content-docs/client'

export const useActiveVersionPath = () => {
  const data = useActivePluginAndVersion({ failfast: false })

  if (data) {
    return data.activeVersion.path
  }

  return '/'
}
