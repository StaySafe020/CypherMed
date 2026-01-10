// Simple WebSocket test client for CypherMed
const io = require('socket.io-client');

const url = process.env.WEBSOCKET_URL || 'http://localhost:3000';
const wallet = process.argv[2] || 'test_wallet_123';

const socket = io(url, { transports: ['websocket', 'polling'] });

socket.on('connect', () => {
  console.log('Connected to WebSocket server:', socket.id);
  socket.emit('authenticate', wallet);
});

socket.on('authenticated', (data) => {
  console.log('Authenticated:', data);
});

socket.on('notification', (notification) => {
  console.log('Received notification:', notification);
});

socket.on('unread_count', (data) => {
  console.log('Unread count:', data.count);
});

socket.on('error', (err) => {
  console.error('Socket error:', err);
});

process.on('SIGINT', () => {
  socket.close();
  process.exit();
});

// Usage: node backend/scripts/test-websocket.js <wallet_address>
