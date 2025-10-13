{
    'name': "POS VeriFactu Offline QR",
    'summary': "Alterna QR de VeriFactu a QR normal si no hay conexión en TPV.",
    'version': '17.0.1.0.0',
    'category': 'Sales/Point of Sale',
    'depends': ['point_of_sale'],

    'data': [
        # Archivos XML de backend, si los hubiera.
    ],

    'assets': {
        # 1. ARCHIVOS JAVASCRIPT
        'point_of_sale.assets': [
            'pos_verifactu_offline_qr/static/src/js/est_verifactu_load.js',
        ],

        # 2. ARCHIVOS QWEB/XML (Plantillas de TPV)
        'web.assets_qweb': [
            'pos_verifactu_offline_qr/static/src/xml/simple_test.xml',
        ],
    },
    'installable': True,
    'license': 'LGPL-3',
}
