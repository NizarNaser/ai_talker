import pymysql

# محرك MySQL في Django يستورد MySQLdb، وPyMySQL مكتبة بايثون خالصة (لا تحتاج
# أدوات بناء نظام مثل libmysqlclient-dev) تحاكي MySQLdb عبر هذا السطر، وهو
# ضروري على الاستضافة المشتركة التي لا تسمح بتثبيت حزم النظام.
pymysql.install_as_MySQLdb()
