import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Markdown from "react-markdown";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css"; // Make sure this path is correct
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";


export default function MarkdownReader() {
  const [content, setContent] = useState("");

  useEffect(() => {
    fetch("/markdown-files/dock.md") // Make sure this path is correct
      .then((res) => res.text())
      .then((text) => setContent(text))
      .catch((err) => console.error("Error loading Markdown:", err));
  }, []);

  useEffect(() => {
    hljs.highlightAll(); // Apply syntax highlighting
  }, [content]); // Runs when markdown content updates

   return (
    <div className="markdown-container">
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code({ inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            return !inline && match ? (
              <pre>
                <code className={`hljs language-${match[1]}`} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="inline-code" {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
