import pymongo
import common
class Instance:
    def __init__(self, settings):
        # create db
        self.client = pymongo.MongoClient(f"mongodb://"
                                          f"{settings['username']}:"
                                          f"{settings['password']}@"
                                          f"{settings['ip']}:"
                                          f"{settings['port']}"
                                          f"/?authMechanism=DEFAULT&authSource=admin")
        self.db = self.client[settings['db']]
        self.settings = self.db['settings']
        self.collection = self.db[settings['collection']]

    def possibleDupesSize(self):
        self.possibleDupesSize = self.collection.aggregate([
            {
                '$group': {
                    '_id': '$st_size',
                    'root': {
                        '$push': '$$ROOT'
                    },
                    'count': {
                        '$sum': 1
                    }
                }
            }, {
                '$match': {
                    'count': {
                        '$gt': 1
                    }
                }
            }, {
                '$unwind': {
                    'path': '$root'
                }
            }, {
                '$project': {
                    '_id': '$root._id',
                    'dir': '$root.dir',
                    'file': '$root.file',
                    'st_ino': '$root.st_ino',
                    'st_nlink': '$root.st_nlink',
                    'st_size': '$root.st_size',
                    'st_atime': '$root.st_atime',
                    'st_mtime': '$root.st_mtime',
                    'st_ctime': '$root.st_ctime'
                }
            }
        ])

    def possibleDupesSizeCount(self):
        self.possibleDupesSizeCount = self.collection.aggregate([
            {
                '$group': {
                    '_id': '$st_size',
                    'root': {
                        '$push': '$$ROOT'
                    },
                    'count': {
                        '$sum': 1
                    }
                }
            }, {
                '$match': {
                    'count': {
                        '$gt': 1
                    }
                }
            }, {
                '$unwind': {
                    'path': '$root'
                }
            }, {
                '$project': {
                    '_id': '$root._id',
                    'dir': '$root.dir',
                    'file': '$root.file',
                    'st_ino': '$root.st_ino',
                    'st_nlink': '$root.st_nlink',
                    'st_size': '$root.st_size',
                    'st_atime': '$root.st_atime',
                    'st_mtime': '$root.st_mtime',
                    'st_ctime': '$root.st_ctime'
                }
            }, {
                '$count': 'root'
            }
        ])

    def possibleDupesHash(self):
        self.possibleDupesHash = self.collection.aggregate([
            {
                '$match': {
                    'partialHash': {
                        '$exists': True
                    }
                }
            }, {
                '$group': {
                    '_id': '$partialHash',
                    'root': {
                        '$push': '$$ROOT'
                    },
                    'count': {
                        '$sum': 1
                    }
                }
            }, {
                '$match': {
                    'count': {
                        '$gt': 1
                    }
                }
            }, {
                '$unwind': {
                    'path': '$root'
                }
            }, {
                '$project': {
                    '_id': '$root._id',
                    'dir': '$root.dir',
                    'file': '$root.file',
                    'st_ino': '$root.st_ino',
                    'st_nlink': '$root.st_nlink',
                    'st_size': '$root.st_size',
                    'st_atime': '$root.st_atime',
                    'st_mtime': '$root.st_mtime',
                    'st_ctime': '$root.st_ctime',
                    'partialHash': '$root.partialHash'
                }
            }
        ])

    def possibleDupesHashCount(self):
        self.possibleDupesHashCount = self.collection.aggregate([
            {
                '$match': {
                    'partialHash': {
                        '$exists': True
                    }
                }
            }, {
                '$group': {
                    '_id': '$partialHash',
                    'root': {
                        '$push': '$$ROOT'
                    },
                    'count': {
                        '$sum': 1
                    }
                }
            }, {
                '$match': {
                    'count': {
                        '$gt': 1
                    }
                }
            }, {
                '$unwind': {
                    'path': '$root'
                }
            }, {
                '$project': {
                    '_id': '$root._id',
                    'dir': '$root.dir',
                    'file': '$root.file',
                    'st_ino': '$root.st_ino',
                    'st_nlink': '$root.st_nlink',
                    'st_size': '$root.st_size',
                    'st_atime': '$root.st_atime',
                    'st_mtime': '$root.st_mtime',
                    'st_ctime': '$root.st_ctime',
                    'partialHash': '$root.partialHash'
                }
            }, {
                '$count': 'root'
            }
        ])

    def delete(self, dir, file):
        self.collection.delete_one({'dir': dir, 'file': file})

    def add(self, item):
        self.collection.insert_one(item)

    def moveOrRename(self, src_path, dest_path):
        src_dir, src_file = common.splitFileName(src_path)
        dest_dir, dest_file = common.splitFileName(dest_path)
        self.collection.updateOne({"dir": src_dir,
                                   "file": src_file},
                                  {"$set": {"dir": dest_dir,
                                            "file": dest_file}})
        pass
