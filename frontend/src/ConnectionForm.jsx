import { useState } from 'react';
import './ConnectionForm.css';

const ConnectionForm = ({ onConnect, isConnected }) => {
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

  return (
    <div className="connection-form">
      <h2>SSH Connection</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="host">Host:</label>
          <input
            type="text"
            id="host"
            name="host"
            value={credentials.host}
            onChange={handleChange}
            placeholder="example.com"
            required
            disabled={isConnected}
          />
        </div>

        <div className="form-group">
          <label htmlFor="port">Port:</label>
          <input
            type="text"
            id="port"
            name="port"
            value={credentials.port}
            onChange={handleChange}
            placeholder="22"
            required
            disabled={isConnected}
          />
        </div>

        <div className="form-group">
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            name="username"
            value={credentials.username}
            onChange={handleChange}
            placeholder="user"
            required
            disabled={isConnected}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={credentials.password}
            onChange={handleChange}
            placeholder="password"
            required
            disabled={isConnected}
          />
        </div>

        <button type="submit" disabled={isConnected}>
          {isConnected ? 'Connected' : 'Connect'}
        </button>
      </form>
    </div>
  );
};

export default ConnectionForm;
