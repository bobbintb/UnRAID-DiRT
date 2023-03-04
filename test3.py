import os

def scan_folder(folder_path):
    # Initialize variables
    total_files = 0
    unique_inodes = set()
    unique_sizes = set()

    # Recursively scan folder and subfolders for files
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            total_files += 1
            file_path = os.path.join(root, file)

            # Get file inode and size
            stat = os.stat(file_path)
            inode = stat.st_ino
            size = stat.st_size

            # Add inode and size to sets
            unique_inodes.add(inode)
            unique_sizes.add(size)

    # Print results
    print("Total number of files:", total_files)
    print("Number of unique inodes:", len(unique_inodes))
    print("Number of unique file sizes:", len(unique_sizes))

# Example usage
scan_folder('/mnt/user/other')


# Total number of files: 53657
# Number of unique inodes: 51776
# Number of unique file sizes: 44406

# 44,433 files before
# Should be 4,536 files left after unique partial hashes removed. I think...