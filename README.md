This is nearly ready for release. However, it depends on the the Linux Auditing System which is currently not enabled in unRAID but I am told it will be in v6.13. My goal is to have this ready by then. Until then, if you would like to alpha or beta test, please contact me.

# UnRAID-DeDuper
This is a plugin for UnRAID that scans and monitors for duplicate files in real-time. This program is very fast at finding duplicates because of the approach it uses. Most programs hash files and compare those hashes to determine duplicates. This program uses several steps to increase efficiency.

1. The directory is scanned and a list of all files and their properties is created.
2. Files are grouped by inode number, so only one operation is done on hard linked files.
3. Files with a unique file size are removed from the list of potential duplicates.
4. A 1k section of each file is hashed initially to eliminate potential duplicates without having to scan the entire file (fewer large files to hash). The Blake3 algorithm is used because of its incredible speed.
5. Files with unique 1k hashes are removed from the list of potential duplicates.
6. The remaining files in the list are then fully hashed.
7. Files with a unique hash are removed from the list of potential duplicates. What remains are potential duplicates.

This process greatly reduces the amount of hashing needed, especially for large files. This is a work in progress but here are a few anecdotal test scans I did with real data in my UnRAID server.

```
Files found: 53,647
3.80 TB (4,181,981,773,439 bytes)
After omitting 1,881 hard linked files: 51,766
After omitting 37,258 unique file sizes: 14,508
     Hashing file 14,508 of 14,508...done.
After omitting 968 unique hashes: 13,540
     Hashing file 13,540 of 13,540...done.
After omitting 185 unique hashes: 13,355
Time elapsed: 13 minutes and 10.19 seconds
```
3.80 TB took 13 minutes and 10.19 seconds to scan.

```
Files found: 26,602
2.05 TB (2,257,131,773,393 bytes)
After omitting 0 hard linked files: 26,602
After omitting 22,461 unique file sizes: 4,141
     Hashing file 4,141 of 4,141...done.
After omitting 3,539 unique hashes: 602
     Hashing file 602 of 602...done.
After omitting 96 unique hashes: 506
Time elapsed: 3 minutes and 22.26 seconds
```
2.05 TB took 3 minutes and 22.26 seconds.

Of course this is just two examples and the total times depends on a number of factors but overall, I am pleased with the efficiency so far.
