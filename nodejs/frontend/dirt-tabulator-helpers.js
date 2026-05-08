// Helper function to remove an action from the queue (UI and backend)
function removeFileActionFromQueue(ino, filePath, dirtySock, actionQueueTable, mainTable, updateQueueFooter) {
    // 1. Send message to backend to remove from Redis
    dirtySock('removeFileAction', { path: filePath });

    // 2. Remove the row from the action queue table
    const rows = actionQueueTable.getRows();
    const rowToDelete = rows.find(row => row.getData().file === filePath);
    if (rowToDelete) {
        rowToDelete.delete().then(() => {
            if (mainTable && updateQueueFooter) {
                updateQueueFooter(actionQueueTable, mainTable);
            }
        });
    }
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Helper function to format dates
function formatDate(cell) {
    const value = cell.getValue();
    if (!value) return '';

    if (typeof luxon !== 'undefined' && window.datetimeFormat) {
        try {
            const dt = luxon.DateTime.fromJSDate(new Date(value));
            if (dt.isValid) {
                return dt.toFormat(window.datetimeFormat);
            }
        } catch (e) {
            console.error("Error formatting date with Luxon:", e);
        }
    }
    return new Date(value).toLocaleString();
}

// Helper function to format size
function formatSize(cell) {
    const value = cell.getValue();
    return formatBytes(value);
}

function checkAndUpdateMasterRow(table) {
    // Defensive: ensure table is valid and has rows
    if (!table || typeof table.getRows !== 'function' || !table.element) return;

    const rows = table.getRows();
    const masterRow = table.element.closest('.tabulator-row');

    if (!masterRow) return;

    // Exclude the 'original' file from the check
    const nonOriginalRows = rows.filter(row => !row.getData().isOriginal);
    // Check if all non-original files have an action
    const allSet = nonOriginalRows.length > 0 && nonOriginalRows.every(row => {
        const action = row.getData().action;
        return action === 'delete' || action === 'link';
    });

    if (allSet) {
        masterRow.style.backgroundColor = 'lightgreen';
    } else {
        masterRow.style.backgroundColor = '';
    }
}

function processDuplicateFiles(duplicates, state, actions) {
    const rightTableData = [];
    const leftTableData = [];

    duplicates.forEach(group => {
        const uniqueInodes = group.files;

        // Sort uniqueInodes by their first path to ensure consistent ordering
        const sortedInodes = uniqueInodes.sort((a, b) => {
            const pathA = a.path.split('<br>')[0];
            const pathB = b.path.split('<br>')[0];
            return pathA.localeCompare(pathB);
        });

        // Find if an original is already designated
        const originalPath = state[group.hash];

        // Process each inode in the group
        const fileList = sortedInodes.map((file, index) => {
            const paths = file.path.split('<br>').filter(p => p);

            // isOriginal is true if ANY of the paths for this inode is the designated original
            const isOriginal = paths.some(p => p === originalPath) || (!originalPath && index === 0);

            // If it's the first inode and no original exists, we need to persist it.
            // We use the first path as the designated original path.
            if (!originalPath && index === 0) {
                if (window.dirtySock) {
                    window.dirtySock('setOriginalFile', { hash: group.hash, path: paths[0], ino: file.ino });
                }
            }

            // Find if any of the paths for this inode has an action.
            let action = null;
            for (const p of paths) {
                if (actions[p]) {
                    action = actions[p];
                    break;
                }
            }

            const fileData = {
                ...file,
                hash: group.hash,
                isOriginal: isOriginal,
                action: action
            };

            // The right table (Action Queue) contains all items, but is filtered to show only those with an action.
            rightTableData.push(fileData);

            return fileData;
        });

        // Calculate total size for the left table using unique inodes to avoid double-counting hardlinks
        const totalSize = uniqueInodes.reduce((acc, file) => acc + file.size, 0);
        const recoverable = totalSize - (uniqueInodes.length > 0 ? uniqueInodes[0].size : 0);

        // Count total paths across all unique inodes for the "Count" column
        const totalPathCount = uniqueInodes.reduce((acc, file) => {
            return acc + file.path.split('<br>').filter(p => p).length;
        }, 0);

        // Add processed group data to the left table
        leftTableData.push({
            hash: group.hash,
            count: totalPathCount,
            size: totalSize,
            recoverable: recoverable,
            fileList: fileList,
        });
    });

    return { leftTableData, rightTableData };
}
