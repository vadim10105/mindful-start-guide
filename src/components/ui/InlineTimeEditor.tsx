import React, { useState, useRef, useEffect } from 'react';
import { validateAndFormatTimeInput } from '@/utils/timeUtils';

interface InlineTimeEditorProps {
  value?: string;
  isLoading?: boolean;
  placeholder?: string;
  onChange?: (newValue: string) => void;
  className?: string;
}

export function InlineTimeEditor({ 
  value, 
  isLoading, 
  placeholder = "15m", 
  onChange,
  className = ""
}: InlineTimeEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Update input value when value prop changes
  useEffect(() => {
    if (value && !isEditing) {
      setInputValue(value);
    }
  }, [value, isEditing]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (isLoading) return;
    setInputValue(value || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmed = inputValue.trim();
    
    if (!trimmed) {
      // If empty, revert to original value
      setInputValue(value || '');
      setIsEditing(false);
      return;
    }

    const formatted = validateAndFormatTimeInput(trimmed);
    
    if (formatted) {
      // Valid input - save and exit edit mode
      onChange?.(formatted);
      setInputValue(formatted);
      setIsEditing(false);
    } else {
      // Invalid input - show error briefly then revert
      setInputValue('Invalid format');
      setTimeout(() => {
        setInputValue(value || '');
        setIsEditing(false);
      }, 1000);
    }
  };

  const handleCancel = () => {
    setInputValue(value || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const baseClassName = `px-2 py-1 bg-muted/50 rounded text-xs text-muted-foreground w-16 text-center ${className}`;

  // Loading state
  if (isLoading) {
    return (
      <div className={baseClassName}>
        <div className="w-3 h-3 border border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  // Editing state
  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`px-2 py-1 bg-muted/50 border-none rounded text-xs text-foreground w-16 text-center focus:outline-none focus:ring-0 ${className}`}
        placeholder={placeholder}
      />
    );
  }

  // Display state
  return (
    <button
      onClick={handleStartEdit}
      className={`${baseClassName} hover:bg-muted/70 transition-colors cursor-pointer border border-transparent hover:border-border/50`}
      title="Click to edit time estimate"
    >
      {value || placeholder}
    </button>
  );
}