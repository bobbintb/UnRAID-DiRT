import json
import logging
import os
import sqlite3
import common
import logstuff


class JsonDatabase:
    def __init__(self, dbname):
        self.dbname = dbname
        self.conn = sqlite3.connect(dbname, check_same_thread=False)
        self.conn.row_factory = lambda cursor, row: self.parse_json_column(cursor, row)
        self.cursor = self.conn.cursor()
        self.create_schema()
        self.sql_logger = logstuff.sql()

    def parse_json_column(self, cursor, row):
        row_dict = {}
        for idx, column in enumerate(cursor.description):
            column_name = column[0]
            column_value = row[idx]
            if column_name == 'data':
                row_dict = json.loads(column_value)
            else:
                row_dict[column_name] = column_value
        return row_dict

    def create_schema(self):
        self.conn.execute(
            """CREATE TABLE IF NOT EXISTS files ("uid" INTEGER PRIMARY KEY AUTOINCREMENT,
            "fqfn" TEXT UNIQUE GENERATED ALWAYS AS (json_extract("data", '$.dir') || json_extract("data", '$.file')) VIRTUAL, 
            "data" TEXT COLLATE BINARY)""")
        # self.close()

    def insert_data(self, json_data_list):
        with self.conn:
            try:
                self.conn.executemany("INSERT INTO files (data) VALUES (?)", [(data,) for data in json_data_list])
            except sqlite3.Error as e:
                self.sql_logger.error(f"Error inserting item: {e}")
        # self.close()

    def delete(self, directory, file):
        try:
            self.cursor.execute("DELETE FROM files WHERE JSON_EXTRACT(data, '$.file') = ? "
                                "AND JSON_EXTRACT(data, '$.dir') = ?", (file, directory))
            self.sql_logger.info(f"Deleted file: {os.path.join(directory, file)}")
        except sqlite3.Error as e:
            self.sql_logger.error(f"Error deleting item: {e}")
        self.conn.commit()
        # self.close()

    def moveOrRename(self, src_path, dest_path):
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
        except sqlite3.Error as e:
            self.sql_logger.error("*-----------------------------")
            self.sql_logger.error(f"Error moving or renaming item: {e}")
            self.sql_logger.error(f"                        query: {query}")
            self.sql_logger.error(f"                       values: {dest_file, dest_dir, src_file, src_dir}")
            self.sql_logger.error("-----------------------------*")
        self.conn.commit()

    def _get_files_of_same_size(self, item):
        files = self.cursor.execute(
            """SELECT data FROM files WHERE json_extract(data, '$.st_size') = ? AND NOT (json_extract(data, 
            '$.file') = ? AND json_extract(data, '$.dir') = ?)""", (item["st_size"], item["file"], item["dir"])
        ).fetchall()
        self.sql_logger.debug('Current item:')
        self.sql_logger.debug(f'    file:        {item}')
        self.sql_logger.debug(f'Files of same size: {len(files)}')
        return files

    def _filter_files(self, item):
        files = self.cursor.execute(
            """SELECT data FROM files WHERE json_extract(data, '$.st_size') = ? AND NOT (json_extract(data, 
            '$.file') = ? AND json_extract(data, '$.dir') = ?)""", (item["st_size"], item["file"], item["dir"])
        ).fetchall()
        self.sql_logger.debug('Current item:')
        self.sql_logger.debug(f'    file:        {item}')
        self.sql_logger.debug(f'Files of same size: {len(files)}')
        return files

    def _hash_files(self, filtered_files, hash_type):
        if hash_type == "partialHash":
            read_size = 1024
        else:
            read_size = -1
        for filtered_file in filtered_files:
            self.sql_logger.debug(f"Hashing ({hash_type}): {filtered_file}")
            filtered_file[hash_type] = common.hashFiles(
                os.path.join(filtered_file["dir"], filtered_file["file"]), filtered_file["st_size"], read_size)
            self.sql_logger.debug("done.")
        return filtered_files

    def addOrModify(self, item):
        # Find other files in the database of the same size
        files = self._get_files_of_same_size(item)
        fqfn = os.path.join(item["dir"], item["file"])
        for file in files:
            self.sql_logger.debug(f'    file:       {file}')
        # If there are files of the same size:
        if len(files) > 0:
            # Filter files of same size and no partial hash so we can hash them. Not removing them from the file list.
            filtered_files = [d for d in files if 'partialHash' not in d or d['partialHash'] is None]
            self.sql_logger.debug(f'Same size files with no partial hash: {len(filtered_files)}')
            self.sql_logger.debug(filtered_files)
            # Hash the filtered files and current file
            self._hash_files(filtered_files, "partialHash")
            item["partialHash"] = common.hashFiles(fqfn, item["st_size"], 1024)
            # Filter files that have the same partial hash as the current.
            filtered_files = [d for d in files if d['partialHash'] == item['partialHash']]
            if len(filtered_files) > 0:
                # Fully hash filtered files and current file
                self._hash_files(filtered_files, "fullHash")
                item["fullHash"] = common.hashFiles(fqfn, item["st_size"], -1)
            # Add them to a query.
            query = """UPDATE files SET data = ? WHERE json_extract(data, '$.file') = ? AND json_extract(data,
            '$.dir') = ?;"""
            values = [(json.dumps(d), d['file'], d['dir']) for d in files]
            self.conn.executemany(query, values)
        exists_query = 'EXISTS(SELECT 1 FROM files WHERE fqfn = ?)'
        exists = bool(self.conn.execute(f"""SELECT {exists_query};""", (fqfn,)).fetchone()[exists_query])
        if exists:
            query = """UPDATE files SET data = ? WHERE json_extract(data, '$.file') = ? AND json_extract(data,
                        #'$.dir') = ?;"""
        else:
            query = """INSERT INTO files(data) VALUES(?)"""
        values = json.dumps(item)
        try:
            self.conn.execute(query, (values,))
        except sqlite3.Error as e:
            logging.error(f"Error inserting new item: {e}")
            logging.error(f"                   query: {query}")
            logging.error(f"                  values: {values}")
        self.conn.commit()


    def close(self):
        self.conn.commit()
        self.conn.close()


'''
INSERT INTO files (data) VALUES (?)
ON CONFILCT(
INSERT INTO phonebook(name,phonenumber) VALUES('Alice','704-555-1212')
  ON CONFLICT(name) DO UPDATE SET phonenumber=excluded.phonenumber;

2.1. Examples
Some examples will help illustrate how UPSERT works:

CREATE TABLE vocabulary(word TEXT PRIMARY KEY, count INT DEFAULT 1); INSERT INTO vocabulary(word) VALUES('jovial') ON 
CONFLICT(word) DO UPDATE SET count=count+1; The upsert above inserts the new vocabulary word "jovial" if that word is 
not already in the dictionary, or if it is already in the dictionary, it increments the counter. The "count+1" 
expression could also be written as "vocabulary.count". PostgreSQL requires the second form, but SQLite accepts either.

CREATE TABLE phonebook(name TEXT PRIMARY KEY, phonenumber TEXT); INSERT INTO phonebook(name,phonenumber) VALUES(
'Alice','704-555-1212') ON CONFLICT(name) DO UPDATE SET phonenumber=excluded.phonenumber; In the second example, 
the expression in the DO UPDATE clause is of the form "excluded.phonenumber". The "excluded." prefix causes the 
"phonenumber" to refer to the value for phonenumber that would have been inserted had there been no conflict. Hence, 
the effect of the upsert is to insert a phonenumber of Alice if none exists, or to overwrite any prior phonenumber 
for Alice with the new one.

Note that the DO UPDATE clause acts only on the single row that experienced the constraint error during INSERT. It is 
not necessary to include a WHERE clause that restricts the action to that one row. The only use for the WHERE clause 
at the end of the DO UPDATE is to optionally change the DO UPDATE into a no-op depending on the original and/or new 
values. For example:

CREATE TABLE phonebook2( name TEXT PRIMARY KEY, phonenumber TEXT, validDate DATE ); INSERT INTO phonebook2(name,
phonenumber,validDate) VALUES('Alice','704-555-1212','2018-05-08') ON CONFLICT(name) DO UPDATE SET 
phonenumber=excluded.phonenumber, validDate=excluded.validDate WHERE excluded.validDate>phonebook2.validDate; In this 
last example, the phonebook2 entry is only updated if the validDate for the newly inserted value is newer than the 
entry already in the table. If the table already contains an entry with the same name and a current validDate, 
then the WHERE clause causes the DO UPDATE to become a no-op.'''

'''
    def addOrModify(self, item):
        # Find other files in the database of the same size
        files = self._get_files_of_same_size(item)
        fqfn = os.path.join(item["dir"], item["file"])
        for file in files:
            self.sql_logger.debug(f'    file:       {file}')
        # If there are files of the same size:
        if len(files) > 0:
            # Filter files of same size and no partial hash so we can hash them. Not removing them from the file list.
            filtered_files = [d for d in files if 'partialHash' not in d or d['partialHash'] is None]
            self.sql_logger.debug(f'Same size files with no partial hash: {len(filtered_files)}')
            self.sql_logger.debug(filtered_files)
            # Hash the filtered files and current file
            self._hash_files(filtered_files, "partialHash")
            item["partialHash"] = common.hashFiles(fqfn, item["st_size"], 1024)
            # Filter files that have the same partial hash as the current.
            filtered_files = [d for d in files if d['partialHash'] == item['partialHash']]
            if len(filtered_files) > 0:
                # Fully hash filtered files and current file
                self._hash_files(filtered_files, "fullHash")
                item["fullHash"] = common.hashFiles(fqfn, item["st_size"], -1)
            # Add them to a query.

            #query = """UPDATE files SET data = ? WHERE json_extract(data, '$.file') = ? AND json_extract(data,
            #'$.dir') = ?;"""
            #values = [(json.dumps(d), d['file'], d['dir']) for d in files]
            #self.conn.executemany(query, values)
        exists = self.conn.execute("""SELECT EXISTS(SELECT 1 FROM files WHERE fqfn = ?);""", (fqfn,)).fetchone()
        print(exists)
        #query = """INSERT INTO files (data) VALUES (?)
        #ON CONFLICT(JSON_EXTRACT(data, '$.file'), JSON_EXTRACT(data, '$.dir')) DO UPDATE SET data = EXCLUDED.data;"""
        #values = json.dumps(item)
        try:
            pass
            #self.conn.execute(query, (values,))
        except sqlite3.Error as e:
            logging.error(f"Error inserting new item: {e}")
            logging.error(f"                   query: {query}")
            logging.error(f"                  values: {values}")
        self.conn.commit()
'''