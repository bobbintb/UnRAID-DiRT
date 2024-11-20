import net from 'net';
import fs from 'fs';
import parseSyslog from 'syslog-parse';

const socketPath = '/var/run/dirty.sock';

if (fs.existsSync(socketPath)) {
    fs.unlinkSync(socketPath);
}

export function dirtySock(onDataCallback) {
    const dirtySockServer = net.createServer((socket) => {
        socket.on('data', (data) => {
            const syslogMessage = data.toString().trim();
            const parsedData = parseSyslog(syslogMessage)
            const messages = JSON.parse(parsedData.message).messages

            messages.forEach(line => {
                line.data = line.data.split(' ').reduce((acc, pair) => {
                    let [key, value] = pair.split('=');
                    if (key === 'name') {
                        if (value.startsWith('"') && value.endsWith('"')) {
                            value = value.slice(1, -1)
                        } else {
                            value = Buffer.from(value, 'hex').toString('utf8');
                        }
                    }

                    acc[key] = value; // Remove quotes from string values

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
