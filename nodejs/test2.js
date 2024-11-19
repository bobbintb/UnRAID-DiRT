import net from 'net';
import fs from 'fs';

// Path to the Unix domain socket
const socketPath = '/dev/dirt.sock';

// Check if the socket file exists, if so, delete it
if (fs.existsSync(socketPath)) {
    fs.unlinkSync(socketPath);  // Ensure we can bind to the socket
}

// Create a server that listens on the Unix domain socket
const server = net.createServer((socket) => {
    socket.on('data', (data) => {
        // Process the incoming data (e.g., output to the console or file)
        console.log('Received audit data:', data.toString());
    });

    socket.on('end', () => {
        console.log('Connection ended.');
    });
});

// Start listening on the Unix domain socket
server.listen(socketPath, () => {
    console.log(`Listening for audit data on ${socketPath}`);
});

// Handle server errors
server.on('error', (err) => {
    console.error('Error in server:', err);
});
