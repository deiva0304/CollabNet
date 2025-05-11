import { WebSocketServer } from 'ws';

const PORT = process.env.SIGNALING_PORT || 4444;

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws) => {
  console.log('New client connected');
  
  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message.toString());
      console.log(`Received message: ${parsedMessage.type} from ${parsedMessage.sender || 'unknown'}`);
      
      // Broadcast to all clients
      wss.clients.forEach(client => {
        if (client !== ws && client.readyState === client.OPEN) {
          client.send(message.toString());
        }
      });
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
  
  // Send initial connection confirmation
  ws.send(JSON.stringify({
    type: 'connection',
    status: 'connected',
    timestamp: new Date().toISOString()
  }));
});

console.log(`Signaling server running on port ${PORT}`);