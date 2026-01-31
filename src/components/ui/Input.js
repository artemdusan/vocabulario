import React from 'react';

const Input = ({ label, error, className = '', ...props }) => (
  <div className={`input-group ${className}`}>
    {label && <label className="input-label">{label}</label>}
    <input className={`input ${error ? 'input-error' : ''}`} {...props} />
    {error && <span className="input-error-text">{error}</span>}
  </div>
);

export default Input;
