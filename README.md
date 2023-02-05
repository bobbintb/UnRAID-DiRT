# UnRAID-DeDuper
This project will eventually become a plugin for UnRAID. The complete plugin will consist of three parts. This is just one of those parts. This script will scan a given directory (specified in the config file) for duplicate files. The results are stored in a MongoDB. The other two pieces of the eventual plugin are a daemon and a webui. The daemon will monitor file changes in real time and update the database. The webui will allow for management of duplicate files.

This program is very fast at finding duplicates because of the approach it uses. Most programs hash files and compare those hashes to determine duplicates. This program uses several steps to increase effeciency.

1. The directory is scanned and a list of all files and their properties is created.
2. Files are grouped by inode number, so only one operation is done on hard linked files.
3. Files with a unique file size are removed from the list. If no other file has the same size as it, it can't possibly have a duplicate so no sense in performing additional operations on it.
4. The middle 1k of each remaining file is read and hashed. This is especially useful for large files, as many files can be determined to be unique without having to hash the entire file. The middle of the file was chosen because it resulted in more eliminations in my tests than the first 1k. I may tweak this over time. The Blake3 algorithm is used to hash as it is extremeley fast. Files with a unique 1k hash are removed from the list.
5. The remaining files in the list are then fully hashed.

The database is updated with the file and hash data at various points in the process. Any files that have the same full hash are duplicates but through this process, the number of files needed to be fully hashed to determine duplicate status it significantly reduced. This is a work in progress but here are a few anecdotal test scans I did with real data in my UnRAID server.

---------------------------------------------------
Files found: 53,647
3.80 TB (4,181,981,773,439 bytes)
After omitting 1,881 hard linked files: 51,766
After omitting 37,258 unique file sizes: 14,508
     Hashing file 14,508 of 14,508...done.
After omitting 968 unique hashes: 13,540
     Hashing file 13,540 of 13,540...done.
After omitting 185 unique hashes: 13,355
Time elapsed: 13 minutes and 10.19 seconds
---------------------------------------------------
Files found: 26,602
2.05 TB (2,257,131,773,393 bytes)
After omitting 0 hard linked files: 26,602
After omitting 22,461 unique file sizes: 4,141
     Hashing file 4,141 of 4,141...done.
After omitting 3,539 unique hashes: 602
     Hashing file 602 of 602...done.
After omitting 96 unique hashes: 506
Time elapsed: 3 minutes and 22.26 seconds
---------------------------------------------------
