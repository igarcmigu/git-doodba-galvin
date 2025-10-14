/** @odoo-module **/

console.log("iva_lineas cargado ");

//Espera a que el POS esté listo
(function waitForPOSRoot() {
    const posRoot = document.querySelector(".pos");
    if (!posRoot) {
        return setTimeout(waitForPOSRoot, 500);
    }

    console.log("📦 POS root encontrado — esperando recibos...");


    //Convierte a float
    function parseNumber(str) {
        return parseFloat(str.replace(/\./g, "").replace(",", "."));
    }


    //Añade los impuestos a las respectivas lineas
    function addTaxesToReceipt(receipt) {

        //Lee las lineas de pedido que están en el html
        const orderlines = receipt.querySelectorAll("li.orderline");
        if (!orderlines.length) return;

        //extrae los datos de los productos
        const taxSummaryBlock = receipt.querySelector(".pos-receipt-taxes");
        const taxLines = [];
        if (taxSummaryBlock) {

            //lee lo que hay en spans
            const spans = [...taxSummaryBlock.querySelectorAll("span")].map(s =>
                s.textContent.trim()
            );

            //agrupa en conjuntos de 4
            for (let i = 0; i < spans.length; i++) {
                const pct = spans[i];
                if (pct.endsWith("%")) {
                    const amount = spans[i + 1] || "";
                    const base = spans[i + 2] || "";
                    const total = spans[i + 3] || "";
                    taxLines.push({
                        pct,
                        amount,
                        base,
                        total,
                        totalNum: parseNumber(total),
                    });
                    i += 3;
                }
            }
        }

       // console.log("Impuestos detectados en resumen:", taxLines);

       //recorre cada linea para asociarle el impuesto que sea
        orderlines.forEach(lineEl => {
            const nameEl = lineEl.querySelector(".product-name .text-wrap");
            const priceEl = lineEl.querySelector(".product-price");
            if (!nameEl || !priceEl) return;

            const productName = nameEl.textContent.trim();
            const priceText = priceEl.textContent.replace(/[^\d,\.]/g, "").trim();
            const priceValue = parseNumber(priceText);

            //Busca impuestos cuyo total coincida con el precio de la linea
            const matchingTaxes = taxLines.filter(
                t => Math.abs(t.totalNum - priceValue) < 0.05
            );

            if (!matchingTaxes.length) return;

             // Evita duplicar si ya se añadió el bloque de impuestos
            if (lineEl.querySelector(".pos-receipt-line-taxes")) return;

            //Crea el bloque donde irán los impuestos
            const taxContainer = document.createElement("ul");
            taxContainer.classList.add("pos-receipt-line-taxes", "info-list", "ms-2");

            matchingTaxes.forEach(tax => {
                const li = document.createElement("li");
                li.textContent = `${tax.pct} (${tax.amount} €)`;
                taxContainer.appendChild(li);
            });

            //Añade el bloque a la linea
            lineEl.appendChild(taxContainer);
           // console.log(`Impuesto asociado a ${productName}:`, matchingTaxes);
        });

    }

    //Es básicamente el hook que llama a la funcion que añade impuestos

    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === 1) {
                    const receipt = node.querySelector?.(".pos-receipt");
                    if (receipt) {
                        //console.log("Recibo detectado");
                        addTaxesToReceipt(receipt);
                    }
                }
            }
        }
    });

     //Vigila todo el DOM del POS
    observer.observe(posRoot, { childList: true, subtree: true });

})();
