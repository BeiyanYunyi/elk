/// <reference lib="WebWorker" />
/// <reference types="vite/client" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
// import * as navigationPreload from 'workbox-navigation-preload'
import { onNotificationClick, onPush } from './web-push-notifications'

declare const self: ServiceWorkerGlobalScope

// if (import.meta.env.PROD)
//   navigationPreload.enable()

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING')
    self.skipWaiting()
})

const entries = self.__WB_MANIFEST
if (import.meta.env.DEV)
  entries.push({ url: '/', revision: Math.random().toString() })

precacheAndRoute(entries)

// clean old assets
cleanupOutdatedCaches()

// allow only fallback in dev: we don't want to cache anything
let allowlist: undefined | RegExp[]
if (import.meta.env.DEV)
  allowlist = [/^\/$/]

// deny api and server page calls
let denylist: undefined | RegExp[]
if (import.meta.env.PROD)
  denylist = [/^\/api\//, /^\/login\//, /^\/oauth\//, /^\/signin\//]

// only cache pages and external assets on local build + start or in production
if (import.meta.env.PROD) {
  // include emoji/twemoji icons
  registerRoute(
    ({ sameOrigin, request, url }) =>
      sameOrigin
        && request.destination === 'image'
        && url.pathname.startsWith('/emojis/twemoji/'),
    new StaleWhileRevalidate({
      cacheName: 'elk-emojis',
      plugins: [
        new CacheableResponsePlugin({ statuses: [200] }),
        // 15 days max
        new ExpirationPlugin({ maxAgeSeconds: 60 * 60 * 24 * 15 }),
      ],
    }),
  )
  // external assets: rn avatars from mas.to
  // requires <img crossorigin="anonymous".../> and http header: Allow-Control-Allow-Origin: *
/*
  registerRoute(
    ({ sameOrigin, request }) => !sameOrigin && request.destination === 'image',
    new NetworkFirst({
      cacheName: 'elk-external-media',
      plugins: [
        // add opaque responses?
        new CacheableResponsePlugin({ statuses: [/!* 0, *!/200] }),
        // 15 days max
        new ExpirationPlugin({ maxAgeSeconds: 60 * 60 * 24 * 15 }),
      ],
    }),
  )
*/
}

// to allow work offline
registerRoute(new NavigationRoute(
  createHandlerBoundToURL('/'),
  { allowlist, denylist },
))

self.addEventListener('push', onPush)
self.addEventListener('notificationclick', onNotificationClick)
