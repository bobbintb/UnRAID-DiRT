import * as xattr from '@napi-rs/xattr';

export async function addDedupeHashAttribute(filePath, hashValue) {
    try {
        await xattr.setAttribute(filePath, 'dedupe.hash', hashValue);
        console.log(`Successfully added dedupe.hash attribute to ${filePath}`);
    } catch (error) {
        console.error(`Failed to add dedupe.hash attribute to ${filePath}: ${error}`);
        const timestamp = Date.now();
        console.log(`Current timestamp: ${timestamp}`);
    }
}

export async function removeDedupeHashAttribute(filePath) {
    try {
        await xattr.removeAttribute(filePath, 'dedupe.hash');
        console.log(`Successfully removed dedupe.hash attribute from ${filePath}`);
    } catch (error) {
        console.error(`Failed to remove dedupe.hash attribute from ${filePath}: ${error}`);
    }
}

export async function getDedupeHashAttribute(filePath) {
    try {
        const attributeValue = xattr.getAttribute(filePath, 'dedupe.hash');
        console.log(`Successfully retrieved dedupe.hash attribute from ${filePath}:`, attributeValue);
        return attributeValue;
    } catch (error) {
        console.error(`Failed to retrieve dedupe.hash attribute from ${filePath}: ${error}`);
    }
}