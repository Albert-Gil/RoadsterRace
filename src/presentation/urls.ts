/** Resolve local game assets within either localhost or a project-site subfolder. */
export function assetUrl(path: string, base = import.meta.env.BASE_URL): string {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(path)) return path;
  const prefix = `${base.replace(/\/+$/, '')}/`;
  if (path.startsWith(prefix)) return path;
  return prefix + path.replace(/^(?:\.\/|\/)+/, '');
}
