/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
<<<<<<< HEAD
// Importar el namespace completo para obtener la función _t, que es la que crea la clase interna.
import * as translation from "@web/core/l10n/translation";
=======
// Confiamos en que la posición final resuelva este import
import { LazyTranslatedString } from "@web/core/l10n/translation"; 
>>>>>>> refs/remotes/origin/master

// 🛑 GUARDIA: Para evitar doble carga.
if (window.POSLazyTranslationPatchLoaded) {
    return;
}
window.POSLazyTranslationPatchLoaded = true;

<<<<<<< HEAD
console.log("🔥 [LOAD CHECK] pos_lazy_translation_patch.js ha iniciado la ejecución (V87: Prototype Extraction).");

// =================================================================
// 🎯 FIX CRÍTICO V87: Extracción y Parche de Prototype
// =================================================================

let LazyTranslatedString;
const _t = translation._t;

// 1. Intentar crear una instancia de LazyTranslatedString usando la función _t.
// La función _t devuelve una instancia de LazyTranslatedString cuando no hay traducción cargada (nuestro caso offline).
if (typeof _t === 'function') {
    try {
        // Creamos una instancia "dummy".
        const dummyInstance = _t("TEST_TRANSLATION_KEY");

        // 2. Extraer el constructor (la clase LazyTranslatedString) del prototipo de la instancia.
        LazyTranslatedString = dummyInstance.constructor;

    } catch (e) {
        console.error("🔴 [LAZY TRANSLATION PROTOTYPE PATCH] Fallo al crear instancia con _t.", e);
    }
}


// 3. Comprobamos si la clase se resolvió correctamente.
if (typeof LazyTranslatedString === 'function' && LazyTranslatedString.prototype) {

    // Aplicamos el parche para evitar el "translation error" en modo síncrono.
    patch(LazyTranslatedString.prototype, {

        /** @override */
        valueOf() {
            // Esto es lo CRÍTICO: devolvemos el texto base (template) en lugar de fallar
            // al intentar resolver la traducción de forma asíncrona/online.
=======
console.log("🔥 [LOAD CHECK] pos_lazy_translation_patch.js ha iniciado la ejecución (V84: Late Load).");

// =================================================================
// 🎯 FIX CRÍTICO V84: Parche de Prototype de LazyTranslatedString
// =================================================================

// Comprobamos si la clase se resolvió correctamente.
if (typeof LazyTranslatedString === 'function' && LazyTranslatedString.prototype) {
    
    // Aplicamos el parche para evitar el "translation error" en modo síncrono.
    patch(LazyTranslatedString.prototype, {
        
        /** @override */
        valueOf() {
>>>>>>> refs/remotes/origin/master
            return this.template || "";
        },

        /** @override */
        toString() {
<<<<<<< HEAD
            // Aseguramos que la conversión a cadena funcione.
            return this.valueOf();
        },

        get: function() {
            // Fallback para cualquier otra propiedad que intente acceder al valor (ej. el atributo 'content').
=======
            return this.valueOf();
        },
        
        get: function() {
>>>>>>> refs/remotes/origin/master
            return this.template || "";
        }
    });

<<<<<<< HEAD
    console.log("✅ [LAZY TRANSLATION PROTOTYPE PATCH] Prototype de LazyTranslatedString parcheado a V87 (Prototype Extraction).");
} else {
     console.error("🔴 [LAZY TRANSLATION PROTOTYPE PATCH] Fallo CRÍTICO. LazyTranslatedString NO se pudo extraer del prototype de la instancia _t.");
}
=======
    console.log("✅ [LAZY TRANSLATION PROTOTYPE PATCH] Prototype de LazyTranslatedString parcheado a V84 (ESM).");
} else {
     // Si esto se sigue imprimiendo, hay un fallo de bundling del core de Odoo.
     console.error("🔴 [LAZY TRANSLATION PROTOTYPE PATCH] Fallo CRÍTICO. LazyTranslatedString NO se resolvió con ESM.");
}
>>>>>>> refs/remotes/origin/master
