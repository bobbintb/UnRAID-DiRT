import os
import time
import shelve
from statistics import mean
from timeit import timeit, repeat

import common

path = "/mnt/user/other"

def _scan(path):
    file_groups = {}
    attributes = ["file",
                  "st_nlink",
                  "st_size",
                  "st_atime",
                  "st_mtime",
                  "st_ctime"]
    for entry in os.scandir(path):
        if entry.is_file():
            stats = entry.stat()
            inode = stats.st_ino
            if inode not in file_groups:
                file_groups[inode] = {'files': []}
            file_groups[inode]['files'].append(entry.path)
            file_groups[inode].update({key: getattr(stats, key) for key in dir(stats) if key in attributes})
        elif entry.is_dir():
            file_groups.update(_scan(entry.path))
    return file_groups



def _scan2(path):
    # This method uses a set to keep track of inodes when trying to filter out uniques. It might be theoretically faster
    # than a dictionary key lookup, but I haven't noticed any benefit in testing. Running 100 tests on each, they only
    # vary by about a tenth of a second.
    file_groups = {}
    attributes = ["file",
                  "st_nlink",
                  "st_size",
                  "st_atime",
                  "st_mtime",
                  "st_ctime"]
    processed_inodes = set()  # Track unique inodes
    for entry in os.scandir(path):
        if entry.is_file():
            stats = entry.stat()
            inode = stats.st_ino
            if inode not in processed_inodes:
                processed_inodes.add(inode)  # Add inode to set
                file_groups[inode] = {'files': []}
                file_groups[inode].update({key: getattr(stats, key) for key in dir(stats) if key in attributes})
            file_groups[inode]['files'].append(entry.path)

        elif entry.is_dir():
            file_groups.update(_scan2(entry.path))
    return file_groups

def _scan3(path):
    file_groups = {}
    attributes = ["file",
                  "st_nlink",
                  "st_atime",
                  "st_mtime",
                  "st_ctime"]
    for entry in os.scandir(path):
        if entry.is_file():
            stats = entry.stat()
            size = stats.st_size
            inode = stats.st_ino
            if size not in file_groups:
                file_groups[size] = {}
            if inode not in file_groups[size]:
                file_groups[size][inode] = {'files': []}
            file_groups[size][inode]['files'].append(entry.path)
            file_groups[size][inode].update({key: getattr(stats, key) for key in dir(stats) if key in attributes})
        elif entry.is_dir():
            file_groups.update(_scan3(entry.path))
    return file_groups

def _scan4(path, allFiles):
    #size_groups = {}
    #inode_groups = {}
    attributes = ["file",
                  "st_nlink",
                  "st_atime",
                  "st_mtime",
                  "st_ctime"]
    for entry in os.scandir(path):
        if entry.is_file():
            stats = entry.stat()
            size = stats.st_size
            inode = stats.st_ino
            allFiles[size][inode]["files"]
            #allFiles[size][inode].update({key: getattr(stats, key) for key in dir(stats) if key in attributes})
        elif entry.is_dir():
            allFiles.update(_scan4(entry.path, allFiles))
    return allFiles

def filter_groups_in_place(groups):
    sizes = set(groups.keys())
    for size in sizes:
        inode_dict = groups[size]
        if len(inode_dict) != 1:
            del groups[size]


# Try to load the cached result from the shelf file
'''with shelve.open('cache.db') as cache:
    if 'result' in cache:
        result = cache['result']
    else:
        # The cached result doesn't exist, so we need to run the slow method
        result = _scan(path)
        # Save the result to the shelf file for future use
        cache['result'] = result'''

setup_code = "import __main__"
scan1 = '__main__._scan("/mnt/user/other")'
scan2 = '__main__._scan2("/mnt/user/other")'
scan3 = '__main__._scan3("/mnt/user/other")'

#execution_time = repeat(scan1, setup=setup_code, repeat=100, number=1)
#print(f"Average execution time: {mean(execution_time)} seconds")

#execution_time = repeat(scan3, setup=setup_code, repeat=1, number=1)
#print(f"Average execution time: {mean(execution_time)} seconds")
allFiles = {}
data = _scan3(path)
i = 0
for item in data:
    if len(item) == 1:
        i += 1
print(i)
filter_groups_in_place(data)

print("done")
#items_list = [item for inner_dict in data.values() for item in inner_dict["files"]]
#print(items_list)
