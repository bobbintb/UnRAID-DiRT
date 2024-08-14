import fs from 'fs';
const outputFile = '/usr/local/emhttp/plugins/bobbintb.system.dedupe/file.log';
const writeStream = fs.createWriteStream(outputFile, { flags: 'a' });

process.stdin.on("data", data => {
    data = data.toString()
    writeStream.write(data + "\n");
});

process.stdin.on('end', () => {
    writeStream.end();
});
