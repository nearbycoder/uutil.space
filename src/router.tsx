import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

import { getContext } from './integrations/tanstack-query/root-provider'

function DefaultNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--app-bg)] px-6 text-center text-[color:var(--app-fg)]">
      <div className="max-w-md rounded-xl border [border-color:var(--app-border)] bg-[color:var(--app-surface-bg)] p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--app-fg-soft)]">Not Found</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">This page does not exist.</h1>
        <p className="mt-3 text-sm text-[color:var(--app-fg-muted)]">
          Check the URL or return to the tooling workspace.
        </p>
        <a
          href="/"
          className="mt-5 inline-flex rounded-md border [border-color:var(--app-border-strong)] bg-[color:var(--app-surface-alt)] px-3 py-2 text-sm text-[color:var(--app-fg)] transition hover:[border-color:var(--app-accent)]"
        >
          Go to uutil.space
        </a>
      </div>
    </div>
  )
}

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,

    context: getContext(),
    defaultNotFoundComponent: DefaultNotFound,

    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
