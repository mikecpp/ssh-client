import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const Terminal = ({ websocket }) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm
    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#ffffff',
      },
      cols: 80,
      rows: 24,
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Handle terminal input
    xterm.onData((data) => {
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(
          JSON.stringify({
            type: 'input',
            data: data,
          })
        );
      }
    });

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(
          JSON.stringify({
            type: 'resize',
            cols: xterm.cols,
            rows: xterm.rows,
          })
        );
      }
    };

    window.addEventListener('resize', handleResize);

    // Initial resize
    setTimeout(() => {
      fitAddon.fit();
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(
          JSON.stringify({
            type: 'resize',
            cols: xterm.cols,
            rows: xterm.rows,
          })
        );
      }
    }, 100);

    return () => {
      window.removeEventListener('resize', handleResize);
      xterm.dispose();
    };
  }, [websocket]);

  useEffect(() => {
    if (!websocket || !xtermRef.current) return;

    const handleMessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'output' && xtermRef.current) {
          xtermRef.current.write(msg.data);
        } else if (msg.type === 'error' && xtermRef.current) {
          xtermRef.current.write(`\r\n\x1b[31mError: ${msg.error}\x1b[0m\r\n`);
        } else if (msg.type === 'connected' && xtermRef.current) {
          xtermRef.current.write('\r\n\x1b[32mConnected to SSH server\x1b[0m\r\n');
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    websocket.addEventListener('message', handleMessage);

    return () => {
      websocket.removeEventListener('message', handleMessage);
    };
  }, [websocket]);

  return (
    <div
      ref={terminalRef}
      style={{
        width: '100%',
        height: '100%',
        padding: '10px',
        backgroundColor: '#1e1e1e',
      }}
    />
  );
};

export default Terminal;
