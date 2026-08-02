/**
 * OrganizaGrana — Componente Toast de feedback global
 */
import React from 'react';

const Toast = ({ message, type = 'default' }) => {
  const icons = {
    success: '✓',
    error:   '✕',
    warning: '⚠',
    default: 'ℹ',
  };

  return (
    <div className={`og-toast og-toast--${type}`}>
      <span>{icons[type] || icons.default}</span>
      <span>{message}</span>
    </div>
  );
};

export default Toast;
