import React, { useRef, useEffect, useState } from "react";
import { useTheme } from "next-themes";

interface HighlightedTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  onLanguageChange: (language: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  language?: string;
}

const HighlightedTextArea: React.FC<HighlightedTextAreaProps> = ({
  value,
  onChange,
  onLanguageChange,
  readOnly = false,
  language = 'javascript',
  placeholder = ''
}) => {
  const { theme } = useTheme();
  const editorRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [prism, setPrism] = useState<typeof import('prismjs') | null>(null);

  useEffect(() => {
    setMounted(true);

    const loadPrismAndTheme = async () => {
      const prism = await import('prismjs');
      await import('prismjs/themes/prism.css');
      await import('prismjs/components/prism-markup');
      await import('prismjs/components/prism-css');
      await import('prismjs/components/prism-csharp');
      await import('prismjs/components/prism-javascript');
      await import('prismjs/components/prism-jsx');
      await import('prismjs/components/prism-typescript');
      await import('prismjs/components/prism-tsx');
      await import('prismjs/components/prism-python');
      await import('prismjs/components/prism-java');
      await import('./css/custom-prism.css');

      const themeLink = document.createElement('link');
      themeLink.rel = 'stylesheet';
      themeLink.dataset.prismTheme = 'true';
      if (theme === 'dark') {
        themeLink.href = 'prismjs/themes/prism-dark.css';
      } else {
        themeLink.href = 'prismjs/themes/prism-funky.css';
      }
      document.head.appendChild(themeLink);

      setPrism(prism);
    };

    if (mounted) {
      loadPrismAndTheme().then(() => {
        if (editorRef.current && prism) {
          prism.highlightElement(editorRef.current);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, mounted]);

  useEffect(() => {
    if (mounted && editorRef.current && prism) {
      let highlightLanguage = language;
      if (language === 'javascript') {
        highlightLanguage = 'jsx';
      }
      if (language === 'typescript') {
        highlightLanguage = 'tsx';
      }
      editorRef.current.className = `language-${highlightLanguage} px-8 py-4 min-h-[20em] w-full border border-gray-300 box-border resize-none overflow-auto`;
      prism.highlightElement(editorRef.current);
    }
  }, [value, language, mounted, prism]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (!readOnly) {
      const newValue = e.currentTarget.textContent || '';
      onChange(newValue);
    }
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onLanguageChange(e.target.value);
  };

  return (
    <div className="relative">
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        onInput={handleInput}
        suppressContentEditableWarning
        spellCheck={false}
        className={`language-${language} px-8 py-4 min-h-[20em] w-full border border-gray-300 dark:border-gray-700 box-border resize-none overflow-auto`}
        style={{
          fontFamily: "Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace",
          whiteSpace: 'pre-wrap',
        }}
        data-placeholder={placeholder}
      >
        {value || placeholder}
      </div>
      <select
        value={language}
        onChange={handleLanguageChange}
        className="absolute bottom-2 right-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm text-gray-800 dark:text-gray-200"
      >
        <option value="javascript">JavaScript</option>
        <option value="typescript">TypeScript</option>
        <option value="python">Python</option>
        <option value="java">Java</option>
        <option value="csharp">C#</option>
        <option value="markup">HTML/XML</option>
        <option value="css">CSS</option>
      </select>
    </div>
  );
};

export default HighlightedTextArea;