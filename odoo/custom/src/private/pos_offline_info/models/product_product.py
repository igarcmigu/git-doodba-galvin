# -*- coding: utf-8 -*-

class ProductProduct(models.Model):
    _inherit = 'product.product'
    
    # ...
    def _get_pos_ui_product_fields(self):
        res = super()._get_pos_ui_product_fields()
        res.append('qty_available')
        res.append('description_sale') 
        return res

    def _export_for_ui(self, product):
        res = super()._export_for_ui(product)
        res['qty_available'] = product.qty_available
        res['description_sale'] = product.description_sale
        return res
