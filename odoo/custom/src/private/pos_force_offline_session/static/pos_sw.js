// Static/src/js/pos_sw.js

// ⚠️ INCREMENTA LA VERSIÓN CADA VEZ QUE MODIFIQUES ESTE ARCHIVO.
const CACHE_NAME = "pos-offline-v27"; // ⬆️ Versión para corregir el TypeError
const OFFLINE_URL = "/pos/ui";

// Mantenemos la lista mínima para asegurar una instalación exitosa.
const CORE_ASSETS = [OFFLINE_URL, "/pos_force_offline_session/static/pos_sw.js"];

self.addEventListener("install", (event) => {
    self.skipWaiting();
    console.log(`[SW-${CACHE_NAME}] ⚙️ Instalación: Preparando CORE assets.`);

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            const cachePromises = CORE_ASSETS.map((url) => {
                return cache
                    .add(url)
                    .then(() =>
                        console.log(`[SW-${CACHE_NAME}] ✅ Cacheado CORE: ${url}`)
                    )
                    .catch((error) => {
                        // Se permite el fallo aquí para evitar que la instalación completa falle.
                        console.warn(
                            `[SW-${CACHE_NAME}] ⚠️ Fallo al cachear CORE (Continuando): ${url}`,
                            error
                        );
                        return Promise.resolve();
                    });
            });
            return Promise.all(cachePromises);
        })
    );
});

self.addEventListener("activate", (event) => {
    console.log(`[SW-${CACHE_NAME}] 🚀 Activado y limpiando cachés antiguas.`);
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            return caches.delete(cacheName);
                        }
                        return Promise.resolve();
                    })
                );
            })
            .then(() => {
                return self.clients.claim();
            })
    );
});

self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);
    const request = event.request;
    const isNavigation = request.mode === "navigate";
    // 0. Ignorar POST, llamadas RPC de Odoo y esquemas no HTTP(S).
    if (request.method !== "GET" || url.pathname.startsWith("/web/dataset/call_kw")) {
        return;
    }

    // 🛑 VERIFICACIÓN CRÍTICA: Ignorar esquemas no HTTP(S) para prevenir el TypeError.
    if (!url.protocol.startsWith("http")) {
        console.warn(
            `[SW-${CACHE_NAME}] 🚫 Saltando solicitud no HTTP(S): ${url.protocol}`
        );
        return;
    }

    // --- NORMALIZACIÓN DE URL DEL POS ---
    const cacheKeyUrl = new URL(url);
    cacheKeyUrl.search = ""; // Elimina parámetros para el HTML principal
    const cacheKey = cacheKeyUrl.toString();
    // ---------------------------------------------

    // 1. ESTRATEGIA: Cache-First para el HTML principal (/pos/ui?...)
    if (isNavigation && url.pathname === OFFLINE_URL) {
        event.respondWith(
            caches
                .match(cacheKey) // Busca con clave normalizada
                .then((response) => {
                    if (response) {
                        console.log(
                            `[SW-${CACHE_NAME}] 🏆 ÉXITO: Sirviendo HTML desde CACHÉ.`
                        );
                        return response;
                    }

                    // Si no está en caché, va a la red y lo guarda (si está online).
                    return fetch(request)
                        .then((networkResponse) => {
                            if (networkResponse.status === 200) {
                                const responseToCache = networkResponse.clone();
                                caches.open(CACHE_NAME).then((cache) => {
                                    cache.put(cacheKey, responseToCache);
                                    console.log(
                                        `[SW-${CACHE_NAME}] 📥 HTML guardado en Runtime Cache.`
                                    );
                                });
                            }
                            return networkResponse;
                        })
                        .catch(() => {
                            // Fallo total (no caché y sin red)
                            console.error(
                                `[SW-${CACHE_NAME}] ❌ Fallo total para HTML.`
                            );
                            return new Response(
                                "<h1>SIN CONEXIÓN: La página principal del POS no pudo ser cargada desde caché.</h1>",
                                {
                                    headers: {"Content-Type": "text/html"},
                                    status: 503,
                                }
                            );
                        });
                })
        );
        return;
    }

    // 2. ESTRATEGIA: Cache-First + Runtime Caching para TODOS los Assets de Odoo
    const isOdooAsset =
        url.pathname.startsWith("/web/assets") ||
        url.pathname.startsWith("/pos_force_offline_session/static") ||
        url.pathname.startsWith("/web/image") ||
        url.pathname.startsWith("/point_of_sale/static/src/img") ||
        url.pathname.startsWith("/web/webclient") ||
        url.pathname.endsWith(".js") ||
        url.pathname.endsWith(".css") ||
        url.pathname.endsWith(".woff2");

    if (isOdooAsset) {
        event.respondWith(
            caches
                .match(request) // Busca el asset exacto (incluyendo hash)
                .then((response) => {
                    if (response) {
                        console.log(
                            `[SW-${CACHE_NAME}-ASSET] 🏆 Sirviendo asset desde CACHÉ: ${url.pathname}`
                        );
                        return response;
                    }

                    // Si no está en caché, va a la red.
                    return fetch(request)
                        .then((networkResponse) => {
                            if (
                                networkResponse &&
                                networkResponse.status === 200 &&
                                request.method === "GET"
                            ) {
                                const responseToCache = networkResponse.clone();
                                caches.open(CACHE_NAME).then((cache) => {
                                    // 📥 Guardamos el asset dinámico.
                                    cache
                                        .put(request, responseToCache)
                                        .then(() =>
                                            console.log(
                                                `[SW-${CACHE_NAME}-ASSET] 📥 Guardado: ${url.pathname}`
                                            )
                                        )
                                        .catch((putError) =>
                                            console.error(
                                                `[SW-${CACHE_NAME}-ASSET] ❌ FALLO PUT al guardar asset: ${url.pathname}`,
                                                putError
                                            )
                                        );
                                });
                            }
                            return networkResponse;
                        })
                        .catch(() => {
                            // Si no hay caché ni red para el asset, devolvemos un 503 vacío.
                            console.warn(
                                `[SW-${CACHE_NAME}-ASSET] ⚠️ Fallo de carga de Asset. No encontrado offline.`
                            );
                            // Devolvemos una Respuesta vacía con un Content-Type genérico para evitar errores de parseo.
                            const contentType = url.pathname.endsWith(".js")
                                ? "application/javascript"
                                : url.pathname.endsWith(".css")
                                ? "text/css"
                                : "application/octet-stream";
                            return new Response("", {
                                status: 503,
                                statusText: "Asset Not Cached",
                                headers: {"Content-Type": contentType},
                            });
                        });
                })
        );
        return;
    }
});
