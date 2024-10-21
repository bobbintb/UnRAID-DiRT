import {process, queue} from "./redisHelper.js"
import fs from "fs";
import CryptoJS from 'crypto-js';

export function enqueueFileAction(obj) {
    console.error(obj)
    process.createJob(obj)
        .setId(CryptoJS.MD5(obj.path).toString())
        .save()
        .then(() => {
        })
        .catch(err => {
            console.error(`Failed to add job ${jobId}:`, err);
        });
}
// export function enqueueFileAction(action, src) {
//     const jobData = {
//         action: action,
//         src: src
//     };
//     process.createJob(jobData).save();
//     // process.getJobs('waiting')
//     // remove jobs from the queue if they aren't in the current list
//     // also make sure jobs are removed from the list when deleted or moved, maybe
//     // 1. check to make sure og file exists and it not in the queue
// }
//
//
//
// async function deleteFile(filePath) {
//     try {
//         await fs.unlink(filePath);
//         console.log('File deleted successfully');
//     } catch (err) {
//         console.error('Error deleting the file:', err);
//     }
// }
//
// deleteFile('path/to/your/file.txt');
//
//
//
//
// const fileNames = [
//     'path/to/file1.txt',
//     'path/to/file2.txt',
//     'path/to/file3.txt'
// ];
//
// async function checkFileAndAct(fileName) {
//     try {
//         await fs.access(fileName);
//         console.log(`${fileName} exists.`);
//         // Take your action for existing files here
//     } catch {
//         console.log(`${fileName} does not exist.`);
//         // Take your action for non-existing files here
//     }
// }
//
// async function checkAllFiles(fileNames) {
//     // Initiate checks for all files concurrently
//     fileNames.forEach(fileName => {
//         checkFileAndAct(fileName);
//     });
// }
//
// // Start checking files
// checkAllFiles(fileNames);