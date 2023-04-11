# UnRAID-DeDuper
This project will eventually become a plugin for UnRAID. The complete plugin will consist of three parts:
* Scanner - Ran once upon initialization. Reads the config file and scans the specified directrory and stores the results in a SQLite database.
* Daemon - Monitors file system changes in real time and update the MongoDB accordingly.
* WebUI - Manage everything from here.

This program is very fast at finding duplicates because of the approach it uses. Most programs hash files and compare those hashes to determine duplicates. This program uses several steps to increase effeciency.

1. The directory is scanned for all files. During scan, file alltributes are recorded and files are organized by size, then inode number (grouping by inode eliminates duplicating tasks on hard linked files).
2. Files with a unique file size are filtered from the list, since files of a unique size can't possible have a duplicate.
3. The middle 1k of each remaining file is read and hashed. This is especially useful for large files, as many files can be determined to be unique without having to hash the entire file. The middle of the file was chosen because it resulted in more eliminations in my tests than the first 1k. I may tweak this over time. The Blake3 algorithm is used to hash as it is extremeley fast.
4. Files with a unique 1k hash are filtered from the list.
5. The remaining files in the list are then fully hashed.

Any files in the database that have the same full hash are duplicates but through this process, the number of files needed to be fully hashed to determine duplicate status it significantly reduced. This is a work in progress but here are a few anecdotal test scans I did with real data in my UnRAID server.

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

Of course this is just two examples and the total times depends on a number of factors but overall, I am pleased with the efficiency so far. I am also working on the daemon and the webui but they are not available at the moment.

If anyone would care to contribute, I am severely lacking in web development skills. The scanner and daemon parts are nearly complete but the webUI is going to take a while as I am figuring it the PHP and JavaScript as I go along.
