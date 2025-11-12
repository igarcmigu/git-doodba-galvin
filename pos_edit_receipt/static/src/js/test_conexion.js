/** @odoo-module **/

//console.log("test_conexion cargado");


const QR_ELEMENT_SELECTOR = "#posqrcode";
const TEXT_BLOCK_CLASS = ".pos-receipt-order-data";


function getFacturaUrl(qrElement) {
    let facturaUrl = null;
    if (qrElement && qrElement.nodeName === "IMG") {
        const srcUrl = qrElement.getAttribute("src");
        if (srcUrl) {
            const match = srcUrl.match(/\/QR\/([^?]+)/);
            if (match && match[1]) {
                facturaUrl = decodeURIComponent(match[1]);
                return facturaUrl;
            }
        }
    }

    const receipt = qrElement.closest(".pos-receipt");
    if (receipt) {
        const allData = receipt.querySelectorAll(TEXT_BLOCK_CLASS);
        let linkText;
        allData.forEach((el) => {
            if (el.textContent.includes("http")) {
                linkText = el.textContent.trim();
            }
        });
        if (linkText) {
            const urlMatch = linkText.match(/(https?:\/\/[^\s]+)/);
            return urlMatch ? urlMatch[0] : null;
        }
    }
    return null;
}

export function generateAndShowQR(qrContainer, facturaUrl) {
    if (typeof QRCode === "undefined") {
        console.error("Error: La librería qrcode.min.js no se ha cargado correctamente.");
        return;
    }
    qrContainer.innerHTML = "";
    if (!facturaUrl) {
        return;
    }
    const qrDiv = document.createElement("div");
    qrContainer.appendChild(qrDiv);
    try {
        new QRCode(qrDiv, {
            text: facturaUrl,
            width: 180,
            height: 180,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H,
        });
    } catch (e) {
        console.error("❌ Error al generar el QR con la librería:", e);
    }
}


export function adaptQRForPrint(receipt, isOfflineForced) {
    let qrElement = receipt.querySelector(QR_ELEMENT_SELECTOR);
    if (!qrElement) return;
    const textElement = qrElement.previousElementSibling;
    const isTextElementValid =
        textElement && textElement.classList.contains(TEXT_BLOCK_CLASS.replace(".", ""));
    if (isOfflineForced) {
        const facturaUrl = getFacturaUrl(qrElement);
        if (isTextElementValid) {
            textElement.style.display = "";
        }
        let newQrElement = qrElement;
        if (qrElement.nodeName === "IMG") {
            newQrElement = document.createElement("div");
            newQrElement.id = qrElement.id;
            newQrElement.className = qrElement.className;
            newQrElement.style.display = ""; // Asegura visibilidad

            qrElement.parentNode.replaceChild(newQrElement, qrElement);
            qrElement = newQrElement;

        } else if (qrElement.nodeName === "DIV") {
            qrElement.style.display = "";
        }
        generateAndShowQR(qrElement, facturaUrl);

    } else {
        if (isTextElementValid) {
            textElement.remove();
        }
        qrElement.remove();
    }
}


(function setupOfflineObserver() {
    async function isOdooReachable() {
        if (window.posOfflineDataHandler && window.posOfflineDataHandler.isOfflineModeActive) {
            console.warn("🟢 CUSTOM SCRIPT: isOdooReachable neutralizado (Modo Offline Forzado).");
            return false;
        }
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

    async function updateOfflineElementsVisibility() {
        let isOnline = navigator.onLine;
        if (isOnline) {
            const reachable = await isOdooReachable();
            if (!reachable) isOnline = false;
        }
        let qrElement = document.querySelector(QR_ELEMENT_SELECTOR);
        if (!qrElement) return;
        const textElement = qrElement.previousElementSibling;
        const isTextElementValid =
            textElement && textElement.classList.contains(TEXT_BLOCK_CLASS.replace(".", ""));
        if (isOnline) {
            qrElement.style.display = "none";
            if (isTextElementValid) {
                textElement.style.display = "none";
            }
        } else {
            if (isTextElementValid) {
                textElement.style.display = "";
            }
            if (qrElement.nodeName === "IMG") {
                const facturaUrl = getFacturaUrl(qrElement);
                const newDiv = document.createElement("div");
                newDiv.id = qrElement.id;
                newDiv.className = qrElement.className;
                newDiv.style.display = "";

                qrElement.parentNode.replaceChild(newDiv, qrElement);
                qrElement = newDiv;
                generateAndShowQR(qrElement, facturaUrl);
            } else if (qrElement.nodeName === "DIV") {
                const facturaUrl = getFacturaUrl(qrElement);
                qrElement.style.display = "";
                generateAndShowQR(qrElement, facturaUrl);
            }
        }
    }

    const posRoot = document.querySelector(".pos");
    if (!posRoot) return setTimeout(setupOfflineObserver, 500);
    if (typeof QRCode === "undefined") return setTimeout(setupOfflineObserver, 500);

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === 1 && node.querySelector?.(".pos-receipt")) {
                    setTimeout(updateOfflineElementsVisibility, 50);
                }
            }
        }
    });

    observer.observe(posRoot, { childList: true, subtree: true });
    window.addEventListener("online", updateOfflineElementsVisibility);
    window.addEventListener("offline", updateOfflineElementsVisibility);
    setTimeout(updateOfflineElementsVisibility, 100);
})();