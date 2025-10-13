/** @odoo-module **/

// Importamos las utilidades de patch y el modelo Order del Point of Sale
import { Order } from "@point_of_sale/app/store/models";
import { patch } from "@web/core/utils/patch";

console.log("🟢 [TEST QR - INICIADO] El archivo simple_test.js ha comenzado su ejecución.");

// Aplicamos un parche al prototipo de Order
patch(Order.prototype, {
    // Sobreescribimos el método initialize, un punto garantizado de ejecución.
    setup(_res) {
        super.setup(...arguments); // Llama al método original

        // Este log sólo se ejecuta si el parche se aplica correctamente
        console.log("🟢 [TEST QR - PATCH OK] Módulo pos_verifactu_offline_qr parcheó Order.prototype. El JS está activo.");
    },

    // Puedes agregar más funciones aquí...
});
