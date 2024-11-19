import net from 'net';
import fs from 'fs';

// Path to the Unix domain socket
const socketPath = '/dev/dirty.sock';

// Check if the socket file exists, if so, delete it
if (fs.existsSync(socketPath)) {
    fs.unlinkSync(socketPath);
}

// Create a server that listens on the Unix domain socket
export function dirtySock(onDataCallback) {
    const dirtySock = net.createServer((socket) => {
        socket.on('data', (data) => {
            onDataCallback(data);
        });

        socket.on('end', () => {
            console.log('Socket connection ended.');
        });
    });

    dirtySock.listen(socketPath, () => {
        console.log(`Socket server listening on ${socketPath}`);
    });

    dirtySock.on('error', (err) => {
        console.error('Socket server error:', err);
    });

    return dirtySock;
}