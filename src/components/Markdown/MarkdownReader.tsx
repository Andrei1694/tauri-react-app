import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css"; // Ensure the path is correct
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import useStore from "../../store/useStore";

export default function MarkdownReader() {
  const [content, setContent] = useState("");
  const { selectedFile } = useStore();
  useEffect(() => {
    // if (!selectedFile) return; // Avoid errors when no page is selected
	console.log(selectedFile)
    fetch(selectedFile.path) // Ensure this is a valid Markdown file path
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load ${selectedFile.title}`);
        return res.text();
      })
      .then((text) => setContent(text))
      .catch((err) => console.error("Error loading Markdown:", err));
  }, [selectedFile]); // Runs when the selectedPage changes

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
