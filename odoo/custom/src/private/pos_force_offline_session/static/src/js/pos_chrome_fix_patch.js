/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { Chrome } from "@point_of_sale/app/pos_app";
import { Chrome } from "@point_of_sale/app/pos_app";

import { useService } from "@web/core/utils/hooks";
import { usePos } from "@point_of_sale/app/store/pos_hook";
import { reactive, onMounted, onWillStart } from "@odoo/owl";

// 🛑 GUARDIA: Para evitar doble carga.
if (window.POSChromePatchLoaded) {
    return;
}
window.POSChromePatchLoaded = true;

console.log("🔥 [LOAD CHECK] pos_chrome_fix_patch.js ha iniciado la ejecución (Fix Chrome setup - V4: Filtrado Defensivo).");

// =================================================================
// 🛠️ FUNCIÓN DE LIMPIEZA CRÍTICA (V4 - Robustez añadida)
// =================================================================

/**
 * Filtra arrays de componentes, eliminando entradas que sean null, undefined o
 * que no contengan la propiedad 'component'.
 * 🚨 FIX CRÍTICO V4: Siempre devuelve un array vacío si la entrada no es un array.
 * @param {Array<Object>} componentsArray
 */
function _filterUndefinedComponents(componentsArray) {
    if (!Array.isArray(componentsArray)) {
        // Si no es un array (incluyendo 'undefined' y 'null'), devolvemos un array vacío [].
        if (componentsArray !== undefined) {
             console.warn(`⚠️ [CHROME PATCH] Se esperaba un array, se encontró: ${typeof componentsArray}. Devolviendo [].`);
        }
        return [];
    }

    // Filtro estricto: el elemento debe existir (no null/undefined) Y debe tener la propiedad 'component'
    const filteredArray = componentsArray.filter(comp => comp && comp.component);

    if (filteredArray.length < componentsArray.length) {
        console.warn(`🛠️ [CHROME PATCH] Se han filtrado ${componentsArray.length - filteredArray.length} entradas de componentes no válidas. Quedan ${filteredArray.length}.`);
    }
    return filteredArray;
}

// =================================================================
// 🎯 PATCH DEL COMPONENTE CHROME
// =================================================================

patch(Chrome.prototype, {

    setup() {
        // Lógica original del setup:

        this.pos = usePos();
        this.popup = useService("popup");

        const reactivePos = reactive(this.pos);
        window.posmodel = reactivePos;

        // 🎯 FIX: INYECCIÓN DE PROPIEDADES EN LA TIENDA POS (Mantener el fix del cajero)
        if (this.pos) {
            this.pos.chrome = this.pos.chrome || {};

            if (!this.pos.getters || !this.pos.getters.get_cashier) {
                this.pos.getters = this.pos.getters || {};
                this.pos.getters.get_cashier = () => ({
                    name: 'Offline User',
                    is_user: true,
                    is_available: true,
                    user_id: [1, 'Offline User']
                });
                console.log("🛠️ [CHROME PATCH] Getter 'get_cashier' mockeado.");
            }
        }


        document.addEventListener("keydown", (ev) => {
            if (ev.key === "Backspace" && !ev.target.matches("input, textarea")) {
                ev.preventDefault();
            }
        });

        // 🚨 HOOK CRÍTICO: LIMPIEZA DE LISTAS DE COMPONENTES ANTES DEL PRIMER RENDER
        onWillStart(async () => {
            if (this.pos) {
                // 💡 FIX V4: El filtro robusto garantiza que el resultado sea [] si la fuente es 'undefined'.
                this.pos.pos_components_header = _filterUndefinedComponents(this.pos.pos_components_header);
                this.pos.pos_components_status = _filterUndefinedComponents(this.pos.pos_components_status);

                // Otras listas de componentes comunes a limpiar, solo por si acaso:
                this.pos.pos_components_main = _filterUndefinedComponents(this.pos.pos_components_main);
            }

            // Mantenemos el _loadFonts seguro
        // 🚨 HOOK CRÍTICO: LIMPIEZA DE LISTAS DE COMPONENTES ANTES DEL PRIMER RENDER
        onWillStart(async () => {
            if (this.pos) {
                // 💡 FIX V4: El filtro robusto garantiza que el resultado sea [] si la fuente es 'undefined'.
                this.pos.pos_components_header = _filterUndefinedComponents(this.pos.pos_components_header);
                this.pos.pos_components_status = _filterUndefinedComponents(this.pos.pos_components_status);

                // Otras listas de componentes comunes a limpiar, solo por si acaso:
                this.pos.pos_components_main = _filterUndefinedComponents(this.pos.pos_components_main);
            }

            // Mantenemos el _loadFonts seguro

            if (this.pos && this.pos._loadFonts) {
                await this.pos._loadFonts();
                console.log("✅ [CHROME PATCH] _loadFonts ejecutado de forma segura.");
            } else {
                 console.warn("⚠️ [CHROME PATCH] Se saltó _loadFonts.");
            }
        });

                 console.warn("⚠️ [CHROME PATCH] Se saltó _loadFonts.");
            }
        });


        // Re-implementar el onMounted original
        onMounted(this.props.disableLoader);
    },
});

console.log("✅ [CHROME PATCH] Parche de Chrome (V4) aplicado.");
console.log("✅ [CHROME PATCH] Parche de Chrome (V4) aplicado.");

