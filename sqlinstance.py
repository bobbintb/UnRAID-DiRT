import json
import os
import sqlite3
import common


class JsonDatabase:
    def __init__(self, dbname):
        self.dbname = dbname
        self.conn = sqlite3.connect(dbname)
        self.conn.row_factory = lambda cursor, row: json.loads(row[0])
        self.cursor = self.conn.cursor()
        self.create_schema()

    def create_schema(self):
        # self.conn.execute('''CREATE TABLE IF NOT EXISTS files (id INTEGER PRIMARY KEY, data TEXT COLLATE BINARY)''')
        # self.conn.execute("""CREATE TABLE IF NOT EXISTS files (data TEXT,PRIMARY KEY (json_extract(data, '$.file'), json_extract(data, '$.dir')))""")
        # self.conn.execute("""CREATE TABLE IF NOT EXISTS files (data TEXT,UNIQUE(json_extract(data, '$.file'), json_extract(data, '$.dir')))""")
        # self.conn.execute("""CREATE TABLE IF NOT EXISTS files(data TEXT, CONSTRAINT pk_files PRIMARY KEY(json_extract(data, '$.file'), json_extract(data, '$.dir')) );""")
        self.conn.execute(
            """CREATE TABLE IF NOT EXISTS files ("fqfn" TEXT UNIQUE GENERATED ALWAYS AS (json_extract("data", '$.dir') || json_extract("data", '$.file')) VIRTUAL, "data" TEXT COLLATE BINARY)""")

        # self.close()

    def insert_data(self, json_data_list):
        with self.conn:
            self.conn.executemany("INSERT INTO files (data) VALUES (?)", [(data,) for data in json_data_list])
        # self.close()

    def delete(self, directory, file):
        print(directory, file)
        self.cursor.execute("DELETE FROM files WHERE JSON_EXTRACT(data, '$.file') = ? "
                            "AND JSON_EXTRACT(data, '$.dir') = ?", (file, directory))
        self.conn.commit()
        # self.close()

    def moveOrRename(self, src_path, dest_path):
        src_dir, src_file = common.splitFileName(src_path)
        dest_dir, dest_file = common.splitFileName(dest_path)
        print(f'src_dir: {src_dir}')
        print(f'src_file: {src_file}')
        print(f'dest_dir: {dest_dir}')
        print(f'dest_file: {dest_file}')

        query = """UPDATE files
                   SET data = json_replace(data,
                            '$.file', ?,
                            '$.dir', ?)
                   WHERE json_extract(data, '$.file') = ?
                   AND json_extract(data, '$.dir') = ?"""

        self.cursor.execute(query, (dest_file, dest_dir, src_file, src_dir))
        self.conn.commit()

    def addOrModify(self, item, add):
        files = self.cursor.execute(
            "SELECT data FROM files WHERE \
            json_extract(data, '$.st_size') = ? \
            AND NOT (json_extract(data, '$.file') = ? \
            AND json_extract(data, '$.dir') = ?)",
            (item["st_size"], item["file"], item["dir"])
        ).fetchall()
        if len(files) > 0:
            # Filter files of same size so that only those with no partial hash remain, then hash them.
            filtered_files = [d for d in files if 'partialHash' not in d or d['partialHash'] is None]
            for filtered_file in filtered_files:
                filtered_file["partialHash"] = common.hashFiles(
                    os.path.join(filtered_file["dir"], filtered_file["file"]), filtered_file["st_size"], 1024)
            item["partialHash"] = common.hashFiles(os.path.join(item["dir"], item["file"]), item["st_size"], 1024)
            # Filter files that have the same partial hash as the action item. Full hash them, add them to a query.
            filtered_files = [d for d in filtered_files if d['partialHash'] == item['partialHash']]
            for filtered_file in filtered_files:
                filtered_file["fullHash"] = common.hashFiles(os.path.join(filtered_file["dir"], filtered_file["file"]),
                                                             filtered_file["st_size"], -1)
            query = "UPDATE files SET data = ? WHERE json_extract(data, '$.file') = ? AND json_extract(data, '$.dir') = ?;"
            values = [(json.dumps(d), d['file'], d['dir']) for d in filtered_files]
            item["fullHash"] = common.hashFiles(os.path.join(item["dir"], item["file"]), item["st_size"], -1)
            self.conn.executemany(query, values)
        if add:
            query = "INSERT INTO files (data) VALUES (?);"
            values = json.dumps(item)
            self.conn.execute(query, values)
        else:
            query = "UPDATE files SET data = ? WHERE json_extract(data, '$.file') = ? AND json_extract(data, '$.dir') = ?;"
            values = (json.dumps(item), item['file'], item['dir'])
            self.conn.execute(query, values)
        self.conn.commit()

    def close(self):
        self.conn.commit()
        self.conn.close()
