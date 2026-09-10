/** Storefront browsing uses the personal context without changing the workspace. */
export function requestTenantContext(pathname: string, apiPath: string | undefined, stored: string | null) {
  const storefrontResource = /^\/?(?:api\/v1\/)?(?:products|services|blogs|styling|site-media|orders|payments|projects\/public)(?:\/|$)/.test(apiPath ?? '')
  const workspace = /^\/(dashboard|platform|business|employee)(\/|$)/.test(pathname)
  return !workspace && storefrontResource ? 'customer' : stored
}
