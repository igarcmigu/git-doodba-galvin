/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { PosPrinterService } from "@point_of_sale/app/printer/pos_printer_service";
import { addTaxesToReceipt } from "./iva_lineas_productos";
import { enhanceTaxBlock } from "./separador";
import { adaptQRForPrint } from "./test_conexion";



async function isOdooReachable() {
    if (window.posOfflineDataHandler && window.posOfflineDataHandler.isOfflineModeActive) {
        return false;
    }
    try {
        const response = await fetch("/web", {
            method: "GET",
            cache: "no-store",

            signal: AbortSignal.timeout(3000),
        });
        return response.ok;
    } catch {
        return false;
    }
}


patch(PosPrinterService.prototype, {

    async printHtml(receipt_html_el) {

        // console.log("🟢🟢 POS PRINTER SERVICE PARCHADO: Interceptando y modificando el DOM para impresión.");

        const posReceiptEl = receipt_html_el.querySelector?.('.pos-receipt') || receipt_html_el;

        if (!posReceiptEl || posReceiptEl.nodeType !== 1) {
            console.error("❌ La entrada no es un elemento DOM válido para modificar.");
            return this.printWeb(receipt_html_el);
        }


        let isPOSOnline = navigator.onLine;

        if (isPOSOnline) {

            const isReachable = await isOdooReachable();
            if (!isReachable) {
                isPOSOnline = false;
            }
        }

        const isPOSOffline = !isPOSOnline;

        await new Promise(resolve => setTimeout(resolve, 50));


        adaptQRForPrint(posReceiptEl, isPOSOffline);

        if (isPOSOffline) {
            await new Promise(resolve => setTimeout(resolve, 20));
        }

        enhanceTaxBlock(posReceiptEl);
        addTaxesToReceipt(posReceiptEl);

        posReceiptEl.style.transform = 'translateX(75%)';

        return this.printWeb(posReceiptEl);
    }
});