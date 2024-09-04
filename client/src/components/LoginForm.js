import React, { useState } from 'react';

const LoginForm = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <div className="form-structor">
      <div className="signup">
        <h2 className="form-title" id="signup">Log in</h2>
        <div className="form-holder">
          <input
            type="text"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Name"
          />
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
        </div>
        <button className="submit-btn" type="submit" onClick={handleSubmit}>Log in</button>
      </div>
    </div>
  );
}

export default LoginForm;