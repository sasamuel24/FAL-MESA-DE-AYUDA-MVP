import React, { useState } from 'react';

interface TooltipCellProps {
  content: string;
  displayContent?: string;
  className?: string;
  maxLength?: number;
  children?: React.ReactNode;
}

export const TooltipCell: React.FC<TooltipCellProps> = ({
  content,
  displayContent,
  className = '',
  maxLength = 25,
  children
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const shouldShowTooltip = content && content.length > maxLength;
  const truncatedContent = displayContent || (content && content.length > maxLength 
    ? `${content.substring(0, maxLength)}...` 
    : content);

  if (children) {
    return (
      <div 
        className={`cell-content-with-tooltip ${className}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {children}
        {shouldShowTooltip && showTooltip && (
          <div className="tooltip">
            {content}
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`cell-content-with-tooltip ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="smart-truncate">
        {truncatedContent}
      </span>
      {shouldShowTooltip && showTooltip && (
        <div className="tooltip">
          {content}
        </div>
      )}
    </div>
  );
};

interface StatusCellProps {
  status: string;
  type?: 'success' | 'warning' | 'error' | 'info' | 'default';
  className?: string;
}

export const StatusCell: React.FC<StatusCellProps> = ({
  status,
  type = 'default',
  className = ''
}) => {
  const getStatusStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-700 border border-green-200';
      case 'warning':
        return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'error':
        return 'bg-red-100 text-red-700 border border-red-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  return (
    <div className="status-cell">
      <span className={`status-badge ${getStatusStyles()} ${className}`} title={status}>
        {status}
      </span>
    </div>
  );
};

interface ActionsCellProps {
  children: React.ReactNode;
  className?: string;
}

export const ActionsCell: React.FC<ActionsCellProps> = ({
  children,
  className = ''
}) => {
  return (
    <div className={`actions-cell ${className}`}>
      {children}
    </div>
  );
};

export default TooltipCell;
