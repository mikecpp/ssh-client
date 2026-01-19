import { useState, useRef } from 'react';
import './App.css';
import ConnectionForm from './ConnectionForm';
import Terminal from './Terminal';

function App() {
  const [websocket, setWebsocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);

  const handleConnect = (credentials) => {
    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Create WebSocket connection
    const ws = new WebSocket('ws://localhost:5000/ws');

    ws.onopen = () => {
      console.log('WebSocket connected');
      // Send connection credentials
      ws.send(
        JSON.stringify({
          type: 'connect',
          host: credentials.host,
          port: credentials.port,
          username: credentials.username,
          password: credentials.password,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'connected') {
          setIsConnected(true);
        } else if (msg.type === 'error') {
          setIsConnected(false);
        }
      } catch (err) {
        console.error('Error parsing message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    wsRef.current = ws;
    setWebsocket(ws);
  };

  return (
    <div className="App">
      <div className="container">
        <h1>SSH Web Client</h1>
        <ConnectionForm onConnect={handleConnect} isConnected={isConnected} />
        <div className="terminal-container">
          {websocket && <Terminal websocket={websocket} />}
          {!websocket && (
            <div className="terminal-placeholder">
              Enter connection details above to start an SSH session
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
