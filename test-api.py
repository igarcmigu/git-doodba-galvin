import xmlrpc.client

url = "http://192.168.191.197:17069/"
db = "devel"
username = "admin"
password = "admin"


common = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/common")
uid = common.authenticate(db, username, password, {})


models = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/object")

orders = models.execute_kw(
    db,
    uid,
    password,
    "pos.order",
    "search_read",
    [[["config_id", "=", 2]]],
    {
        "fields": ["name", "config_id", "amount_total"],
    },
)


for order in orders:
    print("Pedido:", order["name"])
    config_id, cashier = order["config_id"]
    print("Config ID:", config_id)
    print("Cashier:", cashier)
    print("Total:", order["amount_total"])
