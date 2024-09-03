#!/usr/bin/node

import * as queueListener from "./javascript/queueListener.js"
import * as readline from "node:readline";

const rl = readline.createInterface({
    input: process.stdin,
    terminal: false
});

rl.on('line', (line) => {
    try {
        const data = JSON.parse(line);
        switch (data.SYSCALL.SYSCALL) {
            case 'unlinkat':
                unlinkatEvent(data);
                break;
            case 'creat':
                creatEvent(data);
                break;
            case 'renameat':
                renameatEvent(data);
                break;
            default:
                handleUnknownEvent(data);
                break;
        }
    } catch (error) {
        handleError(line);
    }
});

function unlinkatEvent(data) {
    if (isNotDirectory(data.PATH[1].mode)) {
        queueListener.enqueueDeleteFile(data.PATH[1].name)
    }
}

function creatEvent(data) {
    if (isNotDirectory(data.PATH[1].mode)) {
        queueListener.enqueueDeleteFile(data.PATH[1].name)
    }
}

function renameatEvent(data) {
    // If this is a one event rename
    if (data.ID === data.SYSCALL.PID.EVENT_ID) {
        let src = data.PATH[2].name
        let dest = data.PATH[3].name
        queueListener.enqueueMoveFile(src,dest)
    } else {
        // It's a two event rename, using openat because the dest is a dir and not a file
        let src = data.PATH[2].name
        let dest = path.join(data.PROCTITLE.ARGV[2], data.PATH[3].name)
        queueListener.enqueueMoveFile(src,dest)
    }

}

function handleUnknownEvent(data) {}

function handleError(line) {}

function isNotDirectory(mode) {
    const modeNumber = Number(mode);
    const isDirectory = (modeNumber & 0o40000) === 0o40000;
    return !isDirectory;
}