/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
// Confiamos en que la posición final resuelva este import
import { LazyTranslatedString } from "@web/core/l10n/translation"; 

// 🛑 GUARDIA: Para evitar doble carga.
if (window.POSLazyTranslationPatchLoaded) {
    return;
}
window.POSLazyTranslationPatchLoaded = true;

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
            return this.template || "";
        },

        /** @override */
        toString() {
            return this.valueOf();
        },
        
        get: function() {
            return this.template || "";
        }
    });

    console.log("✅ [LAZY TRANSLATION PROTOTYPE PATCH] Prototype de LazyTranslatedString parcheado a V84 (ESM).");
} else {
     // Si esto se sigue imprimiendo, hay un fallo de bundling del core de Odoo.
     console.error("🔴 [LAZY TRANSLATION PROTOTYPE PATCH] Fallo CRÍTICO. LazyTranslatedString NO se resolvió con ESM.");
}