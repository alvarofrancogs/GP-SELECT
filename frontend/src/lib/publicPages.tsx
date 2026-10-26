import { lazy, type ComponentType } from 'react';
import { matchPage, type PageId } from '../i18n/routes';

function deferredPage<Props extends object>(importPage: () => Promise<{ default: ComponentType<Props> }>) {
  let loaded: ComponentType<Props> | undefined;
  let pending: ReturnType<typeof importPage> | undefined;
  const load = () => pending ??= importPage().then((module) => {
    loaded = module.default;
    return module;
  }).catch((error: unknown) => { pending = undefined; throw error; });
  const LazyPage = lazy(load);
  function Page(props: Props) {
    // The router waits for load(). Render the resolved component synchronously, avoiding even the
    // first lazy render's microtask/fallback. Suspense still covers consumers outside the data router.
    const Component = loaded ?? LazyPage;
    return <Component {...props} />;
  }
  return { load, Page };
}

// Shared by React.lazy and navigation intent: importing a page also loads its CSS.
export const publicPages = {
  about: deferredPage(async () => ({ default: (await import('../pages/About')).About })),
  import: deferredPage(async () => ({ default: (await import('../pages/Import')).Import })),
  guide: deferredPage(async () => ({ default: (await import('../pages/Guide')).Guide })),
  contact: deferredPage(async () => ({ default: (await import('../pages/Contact')).Contact })),
  appointments: deferredPage(async () => ({ default: (await import('../pages/Appointments')).Appointments })),
  vehicles: deferredPage(async () => ({ default: (await import('../pages/Vehicles')).Vehicles })),
  vehicle: deferredPage(async () => ({ default: (await import('../pages/VehicleDetail')).VehicleDetail })),
  legal: deferredPage(async () => ({ default: (await import('../pages/Legal')).LegalPage })),
  notFound: deferredPage(async () => ({ default: (await import('../pages/NotFound')).NotFound })),
};

export function preloadPublicPage(pathname: string): Promise<unknown> | undefined {
  const page: PageId | undefined = matchPage(pathname)?.page;
  if (page === 'home' || /^\/admin(?:\/|$)/i.test(pathname)) return;
  if (page === 'aviso-legal' || page === 'privacidad' || page === 'cookies') return publicPages.legal.load();
  return page ? publicPages[page].load() : publicPages.notFound.load();
}
