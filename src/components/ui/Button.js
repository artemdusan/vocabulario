import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled, 
  onClick, 
  className = '', 
  ...props 
}) => (
  <button
    className={`btn btn-${variant} btn-${size} ${className}`}
    disabled={disabled}
    onClick={onClick}
    {...props}
  >
    {children}
  </button>
);

export default Button;
