import React from 'react';
import { Textarea } from './ui/textarea';

interface TextAreaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  readOnly?: boolean;
}

const TextArea: React.FC<TextAreaProps> = ({ value, onChange, readOnly = false, placeholder = '' }) => {
  return (
    <div className="w-full">
      <Textarea
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        placeholder={placeholder}
      />
    </div>
  );
}

export default TextArea;