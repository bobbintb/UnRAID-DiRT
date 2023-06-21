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
        self.conn.execute(
            """CREATE TABLE IF NOT EXISTS files ("fqfn" TEXT UNIQUE GENERATED ALWAYS AS (json_extract("data", 
            '$.dir') || json_extract("data", '$.file')) VIRTUAL, "data" TEXT COLLATE BINARY)""")

        # self.close()

    def insert_data(self, json_data_list, logging):
        with self.conn:
            try:
                self.conn.executemany("INSERT INTO files (data) VALUES (?)", [(data,) for data in json_data_list])
            except sqlite3.Error as e:
                logging.error(f"Error inserting item: {e}")
        # self.close()

    def delete(self, directory, file, logging):
        try:
            self.cursor.execute("DELETE FROM files WHERE JSON_EXTRACT(data, '$.file') = ? "
                                "AND JSON_EXTRACT(data, '$.dir') = ?", (file, directory))
        except sqlite3.Error as e:
            logging.error(f"Error deleting item: {e}")
        self.conn.commit()
        # self.close()

    def moveOrRename(self, src_path, dest_path, logging):
        src_dir, src_file = common.splitFileName(src_path)
        dest_dir, dest_file = common.splitFileName(dest_path)
        query = """UPDATE files
                   SET data = json_replace(data,
                            '$.file', ?,
                            '$.dir', ?)
                   WHERE json_extract(data, '$.file') = ?
                   AND json_extract(data, '$.dir') = ?"""
        try:
            self.cursor.execute(query, (dest_file, dest_dir, src_file, src_dir))
        except sqlite3.IntegrityError as e:
            UniqueConstraint(self, e, logging, src_dir, src_file)
        except sqlite3.Error as e:
            logging.error("*-----------------------------")
            logging.error(f"Error moving or renaming item: {e}")
            logging.error(f"                        query: {query}")
            logging.error(f"                       values: {dest_file, dest_dir, src_file, src_dir}")
            logging.error("-----------------------------*")
        self.conn.commit()

    def addOrModify(self, item, add, logging):
        files = self.cursor.execute(
            """SELECT data FROM files WHERE json_extract(data, '$.st_size') = ? AND NOT (json_extract(data, 
            '$.file') = ? AND json_extract(data, '$.dir') = ?)""", (item["st_size"], item["file"], item["dir"])
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
            query = """UPDATE files SET data = ? WHERE json_extract(data, '$.file') = ? AND json_extract(data, 
            '$.dir') = ?;"""
            values = [(json.dumps(d), d['file'], d['dir']) for d in filtered_files]
            item["fullHash"] = common.hashFiles(os.path.join(item["dir"], item["file"]), item["st_size"], -1)
            self.conn.executemany(query, values)
        if add:
            query = "INSERT INTO files (data) VALUES (?);"
            values = json.dumps(item)
            try:
                self.conn.execute(query, (values,))
            except sqlite3.IntegrityError as e:
                UniqueConstraint(self, e, logging, item["dir"], item["file"])
            except sqlite3.Error as e:
                logging.error(f"Error inserting new item: {e}")
                logging.error(f"                   query: {query}")
                logging.error(f"                  values: {values}")
        else:
            query = """UPDATE files SET data = ? WHERE json_extract(data, '$.file') = ? AND json_extract(data, 
            '$.dir') = ?;"""
            values = (json.dumps(item), item['file'], item['dir'])
            self.conn.execute(query, values)
        self.conn.commit()



    def close(self):
        self.conn.commit()
        self.conn.close()

def UniqueConstraint(self, e, logging, src_dir, src_file):
    logging.error("*-----------------------------")
    logging.error(e)
    logging.error(f'Active file: {os.path.join(src_dir, src_file)}')
    #logging.error(e.args)
    query = """SELECT * FROM files WHERE json_extract(data, '$.file') = ? AND json_extract(data, '$.dir') = ?"""
    try:
        cursor = self.conn.cursor()
        cursor.execute(query, (src_file, src_dir))
        result = cursor.fetchone()
        logging.error(f'Offending row: {result}')
    except sqlite3.Error as er:
        logging.error(er)
    logging.error("-----------------------------*")