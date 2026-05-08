/**
 * Extracts the share name from a given file path.
 * A share is the directory name immediately following /mnt/user/.
 * @param {string} filePath - The full path to the file.
 * @returns {string|null} The name of the share, or null if not found.
 */
function getShareFromPath(filePath) {
    const prefix = '/mnt/user/';
    if (!filePath || !filePath.startsWith(prefix)) {
        return null;
    }
    const pathParts = filePath.substring(prefix.length).split('/');
    return pathParts[0] || null;
}

module.exports = {
    getShareFromPath,
};