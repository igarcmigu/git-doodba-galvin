{
    'name': "POS Offline Product Info",
    'version': '17.0.1.0',
    'category': 'Point of Sale',
    "depends": ["point_of_sale", "stock"],
    'assets': {
       'point_of_sale.assets_pos': [
        'pos_offline_info/static/src/js/pos_offline_info.js',
    ],
    },
    'installable': True,
}