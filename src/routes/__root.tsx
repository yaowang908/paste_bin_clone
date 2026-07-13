import { Outlet, createRootRoute } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '../components/theme-provider'
import Header from '../components/Header'
import { ModeToggle } from '../components/ModeToggle'
import React from 'react'

const TanStackRouterDevtools = import.meta.env.DEV
    ? React.lazy(() =>
          import('@tanstack/router-devtools').then((mod) => ({
              default: mod.TanStackRouterDevtools,
          })),
      )
    : () => null

const queryClient = new QueryClient()

export const Route = createRootRoute({
    component: () => (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
                <div className="w-full h-full min-h-screen px-5 py-5">
                    <div className="absolute top-5 right-10">
                        <ModeToggle />
                    </div>
                    <div className="container mx-auto">
                        <Header />
                        <Outlet />
                    </div>
                </div>
                {import.meta.env.DEV && (
                    <React.Suspense fallback={null}>
                        <TanStackRouterDevtools />
                    </React.Suspense>
                )}
            </ThemeProvider>
        </QueryClientProvider>
    ),
})
