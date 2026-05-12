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
function getUnraidVersion(path) {
    try {
        if (fs.existsSync(path)) {
            const content = fs.readFileSync(path, 'utf8');
            const match = content.match(/version="([^"]+)"/);
            return match ? match[1] : 'Unknown';
        }
    } catch (e) {
        console.error(`[SystemInfo] Error reading Unraid version from ${path}:`, e.message);
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
    const bootUnraid = getUnraidVersion('/boot/unraid-version');

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
