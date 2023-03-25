import sqlite3

class JsonDatabase:
    def __init__(self, dbname):
        self.dbname = dbname
        self.conn = sqlite3.connect(dbname)
        self.create_schema()

    def create_schema(self):
        self.conn.execute('''CREATE TABLE IF NOT EXISTS files (id INTEGER PRIMARY KEY, data TEXT)''')
        self.conn.commit()

    def insert_data(self, json_data_list):
        with self.conn:
            self.conn.executemany("INSERT INTO files (data) VALUES (?)", [(data,) for data in json_data_list])

    def close(self):
        self.conn.close()
