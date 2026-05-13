const os = require('os');
const { execSync } = require('child_process');
const fs = require('fs');

/**
 * Extracts kernel version from a bzImage file.
 * Priority:
 * 1. 'file' command (user suggestion)
 * 2. Native buffer search (fallback)
 * @param {string} bzImagePath - Path to the bzImage file.
 * @returns {string|null} The version string or null if not found.
 */
function getBzImageVersion(bzImagePath) {
    try {
        if (!fs.existsSync(bzImagePath)) {
            const altPath = bzImagePath.replace('bzimage', 'bzImage');
            if (fs.existsSync(altPath)) {
                bzImagePath = altPath;
            } else {
                return null;
            }
        }

        // Method 1: 'file' command
        try {
            // grep -oP 'version \K\S+' extracts the text after 'version ' until the next space
            const cmd = `file -b "${bzImagePath}" | grep -oP 'version \\K\\S+'`;
            const version = execSync(cmd).toString().trim();
            if (version && /^\d/.test(version)) {
                return version;
            }
        } catch (e) {
            // file command might not have the info or grep -P might fail
        }

        // Method 2: Native buffer search (fallback)
        const buffer = fs.readFileSync(bzImagePath);
        const searchStr = "Linux version ";
        let offset = 0;

        while (true) {
            const index = buffer.indexOf(searchStr, offset);
            if (index === -1) break;

            let version = "";
            for (let i = index + searchStr.length; i < buffer.length; i++) {
                const charCode = buffer[i];
                if (charCode === 0x20 || charCode === 0x00 || charCode < 0x20 || charCode > 0x7E) break;
                version += String.fromCharCode(charCode);
            }

            if (version && /^\d/.test(version)) {
                return version;
            }
            offset = index + 1;
            if (offset >= buffer.length) break;
        }

        return null;
    } catch (error) {
        console.error(`[SystemInfo] Error reading version from ${bzImagePath}:`, error.message);
        return null;
    }
}

/**
 * Reads the Unraid version from a version file.
 * @param {string} path - Path to the version file.
 * @returns {string} The Unraid version or 'Unknown'.
 */
function getUnraidVersion(paths) {
    if (!Array.isArray(paths)) paths = [paths];

    for (const path of paths) {
        try {
            if (fs.existsSync(path)) {
                const content = fs.readFileSync(path, 'utf8');

                // Case 1: changes.txt (often found on /boot)
                if (path.endsWith('changes.txt')) {
                    const firstLine = content.split('\n')[0];
                    const versionMatch = firstLine.match(/Unraid OS version (\d+\.\d+\.\d+)/i) ||
                                         firstLine.match(/version (\d+\.\d+\.\d+)/i);
                    if (versionMatch) return versionMatch[1];
                }

                // Case 2: version="6.12.8" format (standard /etc/unraid-version)
                const match = content.match(/version="([^"]+)"/);
                if (match) return match[1];

                // Case 3: plain version string if it looks like a version number
                const plainVersion = content.trim();
                if (/^\d/.test(plainVersion)) return plainVersion;
            }
        } catch (e) {
            console.error(`[SystemInfo] Error reading Unraid version from ${path}:`, e.message);
        }
    }
    return 'Unknown';
}

/**
 * Gets system information including kernel versions and eBPF statuses.
 * @returns {Object} An object containing running and boot kernel info.
 */
function getSystemInfo() {
    const runningRelease = os.release();
    const runningVersion = runningRelease.split('-')[0];
    const runningEbpf = runningRelease.endsWith('-eBPF');
    const runningUnraid = getUnraidVersion('/etc/unraid-version');

    const bootRelease = getBzImageVersion('/boot/bzimage') || 'Unknown';
    const bootVersion = bootRelease.split('-')[0];
    const bootEbpf = bootRelease.endsWith('-eBPF');

    // On Unraid, the boot version can often be found in changes.txt on the flash drive.
    // We also check /boot/unraid-version and /boot/VERSION as fallbacks.
    let bootUnraid = getUnraidVersion(['/boot/changes.txt', '/boot/unraid-version', '/boot/VERSION']);

    // If we still don't have it, we return 'Unknown' as the user wants to know
    // the specific version of the boot image.

    return {
        running: {
            release: runningRelease,
            version: runningVersion,
            ebpfEnabled: runningEbpf,
            unraidVersion: runningUnraid
        },
        boot: {
            release: bootRelease,
            version: bootVersion,
            ebpfEnabled: bootEbpf,
            unraidVersion: bootUnraid
        }
    };
}

module.exports = { getSystemInfo };
