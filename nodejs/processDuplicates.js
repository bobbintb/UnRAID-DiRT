import {process, queue} from "./redisHelper.js"
import fs from "fs";
import crypto from 'crypto';

export function enqueueFileAction(obj) {
    const jobID = crypto.createHash('md5').update(obj.path.toString()).digest('hex');
    if (obj.action === "remove") {
        process.removeJob(jobID)
    } else {
        console.log(obj)
        process.createJob(obj)
            .setId(jobID)
            .save()
            .then(job => {
                if (job.data === obj) {
                    console.log('Job data matches:', job.data);
                } else {
                    console.log('Job data does not match or is new:', job.data);
                }
            })
            .catch(err => {
                console.error(`Failed to add job ${jobID}:`, err);
            });
    }
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