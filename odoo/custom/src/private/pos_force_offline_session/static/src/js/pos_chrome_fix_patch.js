/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
// Importamos la clase Chrome del módulo principal del TPV.
import { Chrome } from "@point_of_sale/app/pos_app"; 
import { useService } from "@web/core/utils/hooks";
import { usePos } from "@point_of_sale/app/store/pos_hook";
import { reactive, onMounted, onWillStart } from "@odoo/owl";

// 🛑 GUARDIA: Para evitar doble carga.
if (window.POSChromePatchLoaded) {
    return;
}
window.POSChromePatchLoaded = true;

console.log("🔥 [LOAD CHECK] pos_chrome_fix_patch.js ha iniciado la ejecución (Fix Chrome setup).");

// Parcheamos la clase Chrome
patch(Chrome.prototype, {
    
    // Sobrescribimos el método setup para inyectar la corrección.
    setup() {
        // Re-implementar la lógica original del setup:
        this.pos = usePos();
        this.popup = useService("popup");

        const reactivePos = reactive(this.pos);
        window.posmodel = reactivePos;

        // prevent backspace from performing a 'back' navigation
        document.addEventListener("keydown", (ev) => {
            if (ev.key === "Backspace" && !ev.target.matches("input, textarea")) {
                ev.preventDefault();
            }
        });

        // 🎯 INYECCIÓN DE LA CORRECCIÓN
        // En lugar de onWillStart(this.pos._loadFonts), usamos una función anónima segura.
        onWillStart(async () => {
            // Se comprueba si this.pos y el método _loadFonts existen antes de llamar.
            if (this.pos && this.pos._loadFonts) {
                await this.pos._loadFonts();
                console.log("✅ [CHROME PATCH] _loadFonts ejecutado de forma segura.");
            } else {
                 console.warn("⚠️ [CHROME PATCH] Se saltó _loadFonts. El método no está disponible o la inicialización es asíncrona (Expected in offline setup).");
            }
        });
        
        // Re-implementar el onMounted original
        onMounted(this.props.disableLoader);
    },
});

console.log("✅ [CHROME PATCH] Parche de Chrome aplicado.");