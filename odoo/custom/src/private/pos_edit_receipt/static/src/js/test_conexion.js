/** @odoo-module **/

console.log("Cargado test de conexion");

//Espera a que el POS esté listo
(function waitForPOSRoot() {

    const posRoot = document.querySelector('.pos');
    if (!posRoot) {
        return setTimeout(waitForPOSRoot, 500);
    }

    // console.log("POS root encontrado");

    async function updateOfflineElementsVisibility() {

        //Comprueba si está online
        let  isOnline = navigator.onLine;

        //Check extra de si el servidor de odoo está disponible
        if (isOnline) {
            const reachable = await isOdooReachable();
            if (!reachable) isOnline = false;
        }

        //Busca el QR normal en el html
        const qrOffline = document.querySelector('#posqrcode');

        const allData = document.querySelectorAll('.pos-receipt-order-data');
        let linkText, codeText;
        allData.forEach(el => {
            if (el.textContent.includes('http')) linkText = el;
            if (el.textContent.includes('Código único')) codeText = el;
        });

        //Oculta los elementos si hay conexion

        if (qrOffline) qrOffline.style.display = isOnline ? 'none' : '';
        // if (linkText) linkText.style.display = isOnline ? 'none' : '';
        // if (codeText) codeText.style.display = isOnline ? 'none' : '';

        console.log(
            isOnline
                ? "🟢 POS en línea — ocultando QR offline"
                : "🔴 POS sin conexión — mostrando QR offline"
        );
    }

     //Es básicamente el hook que llama a la funcion cuando se genera un ticket nuevo
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === 1 && node.querySelector?.('.pos-receipt')) {
                    updateOfflineElementsVisibility();
                }
            }
        }
    });

     //Vigila todo el DOM del POS
    observer.observe(posRoot, { childList: true, subtree: true });

    // Listener de los eventos del navegador para llamar a la funcion de ocultar
    window.addEventListener("online", updateOfflineElementsVisibility);
    window.addEventListener("offline", updateOfflineElementsVisibility);


    //Check extra de si el servidor de odoo responde además de que haya conexion local
    async function isOdooReachable() {
        try {
            const response = await fetch("/web", {
                method: "GET",
                cache: "no-store",
                signal: AbortSignal.timeout(5000),
            });
            return response.ok;
        } catch {
            return false;
        }
    }


})();
