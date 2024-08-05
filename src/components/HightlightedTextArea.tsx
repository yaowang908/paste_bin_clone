import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coy } from "react-syntax-highlighter/dist/cjs/styles/prism";

interface HighlightedTextAreaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  readOnly?: boolean;
  language?: string;
}

const HighlightedTextArea: React.FC<HighlightedTextAreaProps> = ({
  value,
  onChange,
  readOnly = false,
  language = 'javascript',
  placeholder = ''
}) => {
  return (
    <div style={{ position: 'relative' }}>
      <textarea
        rows={4}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        placeholder={placeholder}
        className={`absolute px-8 py-4 top-0 left-0 w-full h-full ${readOnly ? 'opacity-100' : 'opacity-50'} z-10 bg-transparent text-transparent caret-black border border-gray-300 box-border resize-none`}
        style={{
          paddingLeft: '2em',
          paddingRight: '2em',
          fontFamily: "Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace",
        }}
      />
      <SyntaxHighlighter
        language={language}
        style={coy}
        customStyle={{
          margin: 0,
          padding: '16px',
          height: '100%',
          minHeight: '20em',
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'auto',
          zIndex: 0,
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

export default HighlightedTextArea;