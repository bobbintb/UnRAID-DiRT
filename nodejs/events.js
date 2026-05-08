const EventEmitter = require('events');

// Create a single, shared instance of an EventEmitter.
// This will act as a simple message bus for different parts of the application.
const sharedEmitter = new EventEmitter();

module.exports = { sharedEmitter };