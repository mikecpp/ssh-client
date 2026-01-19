import { useState } from 'react';
import './ConnectionForm.css';

const ConnectionForm = ({ onConnect, onDisconnect, isConnected }) => {
  const [credentials, setCredentials] = useState({
    host: '',
    port: '22',
    username: '',
    password: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onConnect(credentials);
  };

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
  };

  const handleDisconnect = () => {
    if (onDisconnect) {
      onDisconnect();
    }
  };

  return (
    <div className="connection-form">
      <form onSubmit={handleSubmit} className="inline-form">
        <input
          type="text"
          name="host"
          value={credentials.host}
          onChange={handleChange}
          placeholder="Host"
          required
          disabled={isConnected}
          className="input-short"
        />
        <input
          type="text"
          name="port"
          value={credentials.port}
          onChange={handleChange}
          placeholder="Port"
          required
          disabled={isConnected}
          className="input-short input-port"
        />
        <input
          type="text"
          name="username"
          value={credentials.username}
          onChange={handleChange}
          placeholder="Username"
          required
          disabled={isConnected}
          className="input-short"
        />
        <input
          type="password"
          name="password"
          value={credentials.password}
          onChange={handleChange}
          placeholder="Password"
          required
          disabled={isConnected}
          className="input-short"
        />
        <button type="submit" disabled={isConnected} className="btn-connect">
          Connect
        </button>
        <button
          type="button"
          onClick={handleDisconnect}
          disabled={!isConnected}
          className="btn-disconnect"
        >
          Disconnect
        </button>
      </form>
    </div>
  );
};

export default ConnectionForm;
