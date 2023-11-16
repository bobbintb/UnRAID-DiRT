from blake3 import blake3
from tqdm import tqdm

import common
import json
import logstuff
import os
import time
import sqlinstance

def _scan(paths):
    allFiles = {}
    # Needed to handle one scan directory or multiple (list vs dict)
    if isinstance(paths, dict):
        paths = paths.values()
    for path in paths:
        scan_logger.debug(f"Scanning root folder: {path}")
        for dirpath, dirnames, filenames in os.walk(path, followlinks=True):
            for file in filenames:
                filepath = os.path.join(dirpath, file)
                statinfo = os.stat(filepath)
                size = statinfo.st_size
                inode = statinfo.st_ino
                allFiles.setdefault(size, {}).setdefault(inode, {}).setdefault('files', []).append(filepath)
                allFiles[size][inode]["st_nlink"] = statinfo.st_nlink
                allFiles[size][inode]["st_atime"] = statinfo.st_atime
                allFiles[size][inode]["st_mtime"] = statinfo.st_mtime
                allFiles[size][inode]["st_ctime"] = statinfo.st_ctime
    return allFiles


def hasher(allFiles, hashtype):
    # allFiles starts with the size group, then inode
    all_files_list = [(size_key, inode, file_attr) for size_key, group in allFiles.items() for inode, file_attr in
                      group.items()]
    total_files = len(all_files_list)
    if hashtype == "partialHash":
        outer_pbar = tqdm(total=total_files, colour="blue", bar_format="{l_bar}{bar:50}|{n_fmt}/{total_fmt}")
        for size_key, inode, file_attr in all_files_list:
            try:
                f = open(file_attr["files"][0], 'rb')
                start_pos = max(0, (size_key // 2) - (1024 // 2))
                f.seek(start_pos)
                f_bytes = f.read(1024)
                h = blake3(f_bytes).hexdigest()
                f.close()
                file_attr["partialHash"] = h
                outer_pbar.update(1)
            except Exception as e:
                print(e)
        outer_pbar.colour = "green"
        outer_pbar.close()
    else:
        try:
            total_files = sum(len(group) for group in allFiles.values())
            total_size = sum(size_key for size_key, _, _ in all_files_list)
            i = 0
            outer_pbar = tqdm(total=total_size, colour="blue", unit_scale=True,
                              bar_format="{percentage:3.0f}%|{bar:50}|{postfix} ({total_fmt})")
            outer_pbar.postfix = f'{i}/{total_files}'
            for size_key, group in allFiles.items():
                for inode, file_attr in group.items():
                    h = blake3()
                    if size_key > 409600:
                        read_size = int(size_key / 100)
                    else:
                        read_size = 4096
                    inner_bar_format = "{l_bar}{bar:50}| {n_fmt}/{total_fmt}"
                                       #"\n" + file_attr['files'][0] + ""\033[F"
                    inner_pbar = tqdm(total=size_key, unit="bytes", unit_divisor=1024, unit_scale=True,
                                      bar_format=inner_bar_format, colour="blue", leave=False)
                    #inner_pbar.postfix = f"\n{file_attr['files'][0]}\033[F"
                    with open(file_attr["files"][0], 'rb') as f:
                        while True:
                            data = f.read(read_size)  # Read 1% at a time.
                            if not data:
                                break
                            h.update(data)
                            inner_pbar.update(len(data))
                            outer_pbar.update(len(data))
                        i += 1
                    outer_pbar.set_postfix_str(f'{i}/{total_files}')  # need to get the last update
                    inner_pbar.colour = "green"
                    inner_pbar.close()
                    file_attr["fullHash"] = h.hexdigest()
            outer_pbar.colour = "green"
            outer_pbar.close()
        except Exception as e:
            print(e)

def filter_unique_sizes(allFiles):
    allFiles_filtered = {}
    # key is size, v is inodes of files with that size
    for size in allFiles:
        if len(allFiles[size]) > 1:
            allFiles_filtered[size] = allFiles[size]
            continue
        for inode in allFiles[size]:
            if len(allFiles[size][inode]['files']) > 1:
                allFiles_filtered[size] = allFiles[size]
    return allFiles_filtered

# There might be a better way to do this than iterating over it twice but I haven't found one yet
def filter_unique_hashes(allFiles, hashtype):
    hashCount = {}
    nonUniqueHashes = {}
    # Count the occurrences of each hash value
    for size, inode_groups in allFiles.items():
        for inode_group, data in inode_groups.items():
            filehash = data[hashtype]
            if filehash in hashCount:
                hashCount[filehash] += 1
            else:
                hashCount[filehash] = 1
    # Filter items with non-unique hash values
    for size, inode_groups in allFiles.items():
        innerNonUniqueHashes = {}
        for inode_group, data in inode_groups.items():
            filehash = data[hashtype]
            if hashCount[filehash] > 1:
                innerNonUniqueHashes[inode_group] = data
        if innerNonUniqueHashes:
            nonUniqueHashes[size] = innerNonUniqueHashes
    return nonUniqueHashes


def prep_for_sql(allFiles):
    return [json.dumps({'dir': os.path.join(os.path.dirname(file), ""),
                        'file': os.path.basename(file),
                        'st_inode': inode,
                        'st_nlink': allFiles[size][inode]['st_nlink'],
                        'st_size': size,
                        'st_atime': allFiles[size][inode]['st_atime'],
                        'st_mtime': allFiles[size][inode]['st_mtime'],
                        'st_ctime': allFiles[size][inode]['st_ctime'],
                        'partialHash': allFiles[size][inode].get('partialHash'),
                        'fullHash': allFiles[size][inode].get('fullHash')})
            for size in allFiles for inode in allFiles[size] for file in allFiles[size][inode]['files']]


scan_logger = logstuff.scan()
def main():

    start_time = time.time()
    settings = common.loadConfig()

    # Scan
    scan_logger.info("Scanning for files...")
    allFiles = _scan(settings["include"])
    #scan_logger.info("done.")

    # Filter sizes
    scan_logger.info("Filtering unique sizes... ")
    allFiles_no_unique_sizes = filter_unique_sizes(allFiles)
    #scan_logger.info("done.")

    # Filter hashes
    scan_logger.info('Hashing files...')
    hasher(allFiles_no_unique_sizes, "partialHash")
    allFiles_no_unique_partHashes = filter_unique_hashes(allFiles_no_unique_sizes, "partialHash")
    #scan_logger.info("done.")


    # Filter hashes #2
    scan_logger.info('Hashing files...')
    hasher(allFiles_no_unique_partHashes, "fullHash")
    allFiles_no_unique_Hashes = filter_unique_hashes(allFiles_no_unique_partHashes, "fullHash")
    #scan_logger.info("done.")

    # Add files to DB
    json_list = prep_for_sql(allFiles)
    db = sqlinstance.JsonDatabase(os.path.join(settings["dbfile"], "deduper.db"))
    db.insert_data(json_list)
    db.close()

    end_time = time.time()
    time_elapsed = end_time - start_time
    minutes, seconds = divmod(time_elapsed, 60)
    print("Time elapsed: {0:.0f} minutes and {1:.2f} seconds".format(minutes, seconds))

main()
