"use client";

import { useEffect, useState } from "react";

export type ErrorAlertType = "error" | "warning" | "info" | "success";

export interface ErrorAlertProps {
  message: string;
  type?: ErrorAlertType;
  dismissible?: boolean;
  autoClose?: number; // milliseconds, 0 = no auto close
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function ErrorAlert({
  message,
  type = "error",
  dismissible = true,
  autoClose = 0,
  action,
}: ErrorAlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoClose > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, autoClose);

      return () => clearTimeout(timer);
    }
  }, [autoClose]);

  if (!isVisible) return null;

  const bgColor: Record<ErrorAlertType, string> = {
    error: "bg-red-50 border-red-200",
    warning: "bg-yellow-50 border-yellow-200",
    info: "bg-blue-50 border-blue-200",
    success: "bg-green-50 border-green-200",
  };

  const textColor: Record<ErrorAlertType, string> = {
    error: "text-red-800",
    warning: "text-yellow-800",
    info: "text-blue-800",
    success: "text-green-800",
  };

  const iconColor: Record<ErrorAlertType, string> = {
    error: "text-red-400",
    warning: "text-yellow-400",
    info: "text-blue-400",
    success: "text-green-400",
  };

  const getIcon = () => {
    switch (type) {
      case "error":
        return "⚠️";
      case "warning":
        return "⚡";
      case "info":
        return "ℹ️";
      case "success":
        return "✓";
    }
  };

  return (
    <div className={`${bgColor[type]} border-l-4 p-4 mb-4 rounded-md flex items-start gap-3`}>
      <span className={`text-lg flex-shrink-0 ${iconColor[type]}`}>{getIcon()}</span>
      <div className="flex-1">
        <p className={`${textColor[type]} text-sm font-medium`}>{message}</p>
      </div>
      <div className="flex items-center gap-2">
        {action && (
          <button
            onClick={action.onClick}
            className={`${textColor[type]} text-sm font-medium hover:underline`}
          >
            {action.label}
          </button>
        )}
        {dismissible && (
          <button
            onClick={() => setIsVisible(false)}
            className={`${textColor[type]} hover:opacity-70 transition-opacity`}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
