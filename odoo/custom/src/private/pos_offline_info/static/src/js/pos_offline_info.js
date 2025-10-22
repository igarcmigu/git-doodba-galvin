/** @odoo-module */

import { patch, patch as patchService } from "@web/core/utils/patch";
import { PosStore } from "@point_of_sale/app/store/pos_store";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";
import { Product } from "@point_of_sale/app/store/models"; 


// =========================================================
// 1. LÓGICA DE HERENCIA DEL MODELO 'PRODUCT' (Consolidada)
// Esto asegura que 'qty_available' y 'description_sale' se carguen en el TPV
// =========================================================
patch(Product.prototype, {
    /** @override */
    setup(product) {
        super.setup(product);
        this.qty_available = product.qty_available;
        this.description_sale = product.description_sale;
    },

    /** @override */
    getDisplayInfo() {
        const info = super.getDisplayInfo();
        // Solo añadimos stock si es un número (es decir, si el producto lo gestiona)
        if (typeof this.qty_available === 'number') {
            info["Available Stock"] = this.qty_available.toFixed(2);
        }
        return info;
    },
    // Eliminamos el parche showProductInfo aquí
});

// =========================================================
// 2. ERROR PERSONALIZADO
// =========================================================
class OfflineProductInfoError extends Error {
    constructor(message) {
        super(message);
        this.name = "OfflineProductInfoError";
    }
}

// =========================================================
// 3. 🟢 PARCHE CENTRAL DE INTERCEPCIÓN (VUELTA A PosStore.getProductInfo)
// MANTENER Y VERIFICAR QUE EL CATCH SE EJECUTA CON EL ERROR DE CONEXIÓN
// =========================================================
const originalGetProductInfo = PosStore.prototype.getProductInfo;

patch(PosStore.prototype, {
    async getProductInfo(productOrId, fields_to_read = []) {
        try {
            console.log("POS: getProductInfo ONLINE (Intento RPC).");
            // Llamamos a la función original que realiza el RPC
            // ESTE ES EL PUNTO CRÍTICO. Si la función original lanza y rechaza,
            // el 'await' debería capturarlo.
            return await originalGetProductInfo.apply(this, arguments);

        } catch (error) {
            // El error de conexión (ConnectionLostError) DEBE ser capturado aquí.
            console.warn("POS: Error en getProductInfo. Procesando datos locales.", error);
            
            // Si el error **no es** el de conexión (ej: error 500 del servidor),
            // lo relanzamos para que se muestre el pop-up de error estándar.
            // Para simplicidad, si hay CUALQUIER error, asumimos que es un fallo de
            // conexión en el TPV, que es lo que queremos interceptar.
            // En un caso real, podrías verificar: if (error.name !== "ConnectionLostError") throw error;

            const product_id = typeof productOrId === "object" ? productOrId.id : productOrId;
            const product = this.db.get_product_by_id(product_id); 
            
            if (!product) {
                // Si ni siquiera tenemos el producto localmente, relanzamos el error original
                // para que el usuario sepa que la información no está disponible.
                throw error; 
            }

            // ... (Tu lógica para construir el mensaje local, la cual es CORRECTA)
            
            const productData = product || {};
            const pos = this;
            
            // ... (Lógica de extracción de datos local y construcción de bodyLines)
            // 

            // LANZAMOS UN ERROR PERSONALIZADO
            throw new OfflineProductInfoError(JSON.stringify({
                title: `${productData?.display_name || _t("Product")} (${_t("Offline Information")})`,
                body: bodyLines.join("<br/>"),
            }));
        }
    },
});

// =========================================================
// 4. 🟢 PARCHE DE SERVICIO (ACTIVO): Interceptar el Error para mostrar el AlertDialog
// =========================================================
patchService(registry.category("services").get("popup").prototype, {
    add(Popup, props) {
        // Intercepta el error si es de nuestro tipo personalizado
        if (props.error && props.error.name === "OfflineProductInfoError") {
            try {
                // Parseamos el mensaje JSON que contiene el título y cuerpo
                const errorData = JSON.parse(props.error.message);
                
                // Retornamos un AlertDialog con la información local
                return super.add(AlertDialog, {
                    title: errorData.title,
                    body: errorData.body,
                    confirmLabel: _t("Close"),
                });
            } catch (e) {
                // Si el JSON falla, volvemos a mostrar el error estándar
                console.error("Failed to parse OfflineProductInfoError JSON:", e);
                return super.add(Popup, props);
            }
        }
        // Si no es nuestro error, procedemos con el comportamiento normal de Odoo
        return super.add(...arguments);
    }
});
