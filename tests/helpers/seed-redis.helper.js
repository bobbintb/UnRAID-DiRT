const { faker } = require('@faker-js/faker');
const { connectToRedis, getFileMetadataRepository, closeRedis } = require('../../nodejs/redis');

// --- Configuration ---
const NUM_DUPLICATE_GROUPS = 50;
const MIN_FILES_PER_GROUP = 2;
const MAX_FILES_PER_GROUP = 5;

function createFileRecord(ino, hash, size) {
    const filePath = faker.system.filePath();
    const share = faker.system.directoryPath().split('/').pop() || 'share';
    return { ino, path: [filePath], shares: [share], size, nlink: 1, atime: faker.date.past(), mtime: faker.date.past(), ctime: faker.date.past(), hash };
}

function generateMockData() {
    const files = [];
    let currentInode = 5000;
    for (let i = 0; i < NUM_DUPLICATE_GROUPS; i++) {
        const hash = faker.string.uuid();
        const size = faker.number.int({ min: 1024, max: 10 * 1024 * 1024 });
        const numFiles = faker.number.int({ min: MIN_FILES_PER_GROUP, max: MAX_FILES_PER_GROUP });
        for (let j = 0; j < numFiles; j++) {
            files.push(createFileRecord(currentInode++, hash, size));
        }
    }
    return files;
}

async function seedDatabase() {
    console.log('Starting to seed the database...');
    let redisClient;
    let fileMetadataRepository;

    try {
        const connections = await connectToRedis({ startListener: false });
        redisClient = connections.redisClient;
        fileMetadataRepository = connections.fileMetadataRepository;
        console.log('Connected to Redis.');

        console.log('Clearing existing data...');
        const keys = await redisClient.keys('ino:*');
        if (keys.length > 0) {
            await redisClient.del(keys);
        }

        const staticSampleFiles = [
            { ino: 1001, path: ['/mnt/user/downloads/incomplete/movie.mkv'], shares: ['downloads'], size: 8589934592, nlink: 1, atime: new Date('2023-10-26T10:00:00Z'), mtime: new Date('2023-10-26T10:00:00Z'), ctime: new Date('2023-10-26T10:00:00Z') },
            { ino: 1002, path: ['/mnt/user/media/movies/Movie (2023).mkv'], shares: ['media'], size: 8589934592, nlink: 1, atime: new Date('2023-10-25T14:30:00Z'), mtime: new Date('2023-10-25T14:30:00Z'), ctime: new Date('2023-10-25T14:30:00Z') },
            { ino: 2001, path: ['/mnt/user/documents/archive.zip'], shares: ['documents'], size: 5242880, nlink: 1, atime: new Date('2023-11-01T09:00:00Z'), mtime: new Date('2023-11-01T09:00:00Z'), ctime: new Date('2023-11-01T09:00:00Z'), hash: 'unique_hash_abcdef123456' },
            { ino: 3001, path: ['/mnt/user/photos/vacation/IMG_001.jpg'], shares: ['photos'], size: 4194304, nlink: 1, atime: new Date('2023-08-15T18:20:00Z'), mtime: new Date('2023-08-15T18:20:00Z'), ctime: new Date('2023-08-15T18:20:00Z'), hash: 'duplicate_hash_A_9876543210' },
            { ino: 3002, path: ['/mnt/user/backups/photos_2023/IMG_001_copy.jpg'], shares: ['backups'], size: 4194304, nlink: 1, atime: new Date('2023-09-01T11:00:00Z'), mtime: new Date('2023-09-01T11:00:00Z'), ctime: new Date('2023-09-01T11:00:00Z'), hash: 'duplicate_hash_A_9876543210' },
            { ino: 3003, path: ['/mnt/user/staging/sorted/IMG_001.jpg'], shares: ['staging'], size: 4194304, nlink: 1, atime: new Date('2023-10-20T15:00:00Z'), mtime: new Date('2023-10-20T15:00:00Z'), ctime: new Date('2023-10-20T15:00:00Z'), hash: 'duplicate_hash_A_9876543210' },
            { ino: 4001, path: ['/mnt/user/downloads/document.pdf'], shares: ['downloads'], size: 1048576, nlink: 1, atime: new Date('2023-11-05T12:00:00Z'), mtime: new Date('2023-11-05T12:00:00Z'), ctime: new Date('2023-11-05T12:00:00Z'), hash: 'duplicate_hash_B_fedcba54321' },
            { ino: 4002, path: ['/mnt/user/documents/important/document_final.pdf'], shares: ['documents'], size: 1048576, nlink: 1, atime: new Date('2023-11-05T12:05:00Z'), mtime: new Date('2023-11-05T12:05:00Z'), ctime: new Date('2023-11-05T12:05:00Z'), hash: 'duplicate_hash_B_fedcba54321' },
        ];

        const generatedFiles = generateMockData();
        const allFilesToSeed = [...staticSampleFiles, ...generatedFiles];

        console.log(`Preparing to seed ${allFilesToSeed.length} file records...`);

        const savePromises = allFilesToSeed.map(fileData =>
            fileMetadataRepository.save(fileData.ino.toString(), fileData)
        );
        await Promise.all(savePromises);

        console.log('Successfully seeded the database.');

        const allFiles = await fileMetadataRepository.search().return.all();
        console.log(`Verification: Found ${allFiles.length} records in the database.`);

    } catch (error) {
        console.error('An error occurred during seeding:', error);
    } finally {
        await closeRedis();
        console.log('Disconnected from Redis.');
    }
}

seedDatabase();
