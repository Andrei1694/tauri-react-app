import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Markdown, { type Components } from "react-markdown";
import "highlight.js/styles/github-dark.css";
import hljs from "highlight.js";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import useStore from "../../store/useStore";
import "./Markdown.css";

function highlightSnippet(code: string, language: string | null): string {
  if (language && hljs.getLanguage(language)) {
    return hljs.highlight(code, { language }).value;
  }

  return hljs.highlightAuto(code).value;
}

export default function MarkdownReader() {
  const selectedFile = useStore((state) => state.selectedFile);
  const [content, setContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const copyResetTimer = useRef<number | null>(null);

  const handleCopy = useCallback(async (text: string, token: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(token);

      if (copyResetTimer.current) {
        window.clearTimeout(copyResetTimer.current);
      }

      copyResetTimer.current = window.setTimeout(() => {
        setCopiedToken(null);
      }, 1300);
    } catch (clipboardError) {
      console.error("Failed to copy code block:", clipboardError);
      setCopiedToken(null);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (copyResetTimer.current) {
        window.clearTimeout(copyResetTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const abortController = new AbortController();

    const loadMarkdown = async () => {
      if (!selectedFile) {
        setContent("");
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(selectedFile.path, { signal: abortController.signal });

        if (!response.ok) {
          throw new Error(`Failed to load ${selectedFile.title}`);
        }

        const nextContent = await response.text();
        setContent(nextContent);
      } catch (loadError) {
        if (abortController.signal.aborted) {
          return;
        }

        console.error("Error loading markdown:", loadError);
        setError("Could not load this document. Check the file path in files.json.");
        setContent("");
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadMarkdown();

    return () => {
      abortController.abort();
    };
  }, [selectedFile]);

  const markdownComponents = useMemo<Components>(() => {
    let codeIndex = 0;

    return {
      code({ className, children, ...props }) {
        const rawCode = String(children).replace(/\n$/, "");
        const languageMatch = /language-(\w+)/.exec(className ?? "");
        const language = languageMatch?.[1] ?? null;
        const shouldRenderInline = !className && !rawCode.includes("\n");

        if (shouldRenderInline) {
          return (
            <code className="md-inline-code" {...props}>
              {children}
            </code>
          );
        }

        const highlightedCode = highlightSnippet(rawCode, language);
        const token = `${selectedFile?.path ?? "unknown"}:${codeIndex}`;
        const copied = copiedToken === token;
        codeIndex += 1;

        return (
          <div className="md-code-block">
            <div className="md-code-block__header">
              <span>{language ?? "plain text"}</span>
              <button
                type="button"
                className="md-code-block__copy"
                onClick={() => {
                  void handleCopy(rawCode, token);
                }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre>
              <code
                className={language ? `hljs language-${language}` : "hljs language-plaintext"}
                dangerouslySetInnerHTML={{ __html: highlightedCode }}
              />
            </pre>
          </div>
        );
      },
    };
  }, [copiedToken, handleCopy, selectedFile?.path]);

  if (!selectedFile) {
    return (
      <section className="markdown-reader">
        <div className="markdown-reader__state">Select a document from the left panel to start reading.</div>
      </section>
    );
  }

  return (
    <section className="markdown-reader">
      <header className="markdown-reader__toolbar">
        <div className="markdown-reader__meta">
          <h2>{selectedFile.title}</h2>
          <p>{selectedFile.path}</p>
        </div>

        <button
          type="button"
          className="markdown-reader__mode-toggle"
          onClick={() => setIsEditing((current) => !current)}
        >
          {isEditing ? "Preview" : "Edit"}
        </button>
      </header>

      {isLoading && <div className="markdown-reader__state">Loading document...</div>}
      {error && <div className="markdown-reader__state markdown-reader__state--error">{error}</div>}

      {!isLoading && !error &&
        (isEditing ? (
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="markdown-reader__editor"
            spellCheck={false}
            aria-label="Markdown editor"
          />
        ) : (
          <article className="markdown-reader__content markdown-body">
            <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
              {content}
            </Markdown>
          </article>
        ))}
    </section>
  );
}

