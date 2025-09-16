import net from 'net';
import fs from 'fs';
import parseSyslog from 'syslog-parse';

const socketPath = '/run/dirty.sock';

if (fs.existsSync(socketPath)) {
    fs.unlinkSync(socketPath);
}

/**
 * Creates a Unix socket server to listen for file system events from a syslog-like source.
 * @param {function} onDataCallback - The callback function to execute when data is received.
 * @returns {net.Server} The created socket server.
 */
export function dirtySock(onDataCallback) {
    /**
     * @param {net.Socket} socket - The socket object for the connection.
     */
    const dirtySockServer = net.createServer((socket) => {
        socket.on('data', (data) => {
            const syslogMessage = data.toString().trim();
            const parsedData = parseSyslog(syslogMessage)
            const messages = JSON.parse(parsedData.message).messages

            messages.forEach(line => {
                line.data = line.data.split(' ').reduce((acc, pair) => {
                    let [key, value] = pair.split('=');

                    if ((key === 'name' || key === 'proctitle') && !value.startsWith('"') && !value.endsWith('"')) {
                        value = Buffer.from(value, 'hex').toString('utf8');
                    }
                    if (value.startsWith('"') && value.endsWith('"')) {
                        value = value.slice(1, -1)
                    }

                    acc[key] = value;

                    return acc;
                }, {})})

            onDataCallback(messages);
        });

        socket.on('end', () => {
            console.log('Socket connection ended.');
        });
    });

    dirtySockServer.listen({ path: socketPath }, () => {
        console.log(`Socket server listening on ${socketPath}`);
    });

    dirtySockServer.on('error', (err) => {
        console.error('Socket server error:', err);
    });

    return dirtySockServer;
}
