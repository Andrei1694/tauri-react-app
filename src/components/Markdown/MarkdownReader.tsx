import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css"; // Ensure the path is correct
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { CopyToClipboard } from "react-copy-to-clipboard"; // Import CopyToClipboard
import useStore from "../../store/useStore";

export default function MarkdownReader() {
  const [content, setContent] = useState("");
  const [isEditing, setIsEditing] = useState(false); // New state to toggle edit mode
  const { selectedFile } = useStore();

  useEffect(() => {
    if (!selectedFile) return; // Ensure selectedFile exists
    console.log(selectedFile);

    fetch(selectedFile.path) // Ensure this is a valid Markdown file path
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load ${selectedFile.title}`);
        return res.text();
      })
      .then((text) => setContent(text))
      .catch((err) => console.error("Error loading Markdown:", err));
  }, [selectedFile]); // Runs when the selectedFile changes

  useEffect(() => {
    hljs.highlightAll(); // Apply syntax highlighting
  }, [content]); // Runs when markdown content updates

  const handleChange = (e) => {
    setContent(e.target.value); // Update content when the user types in the textarea
  };

  return (
    <div className="markdown-container">
      {/* Button to toggle edit mode */}
      <button
        onClick={() => setIsEditing(!isEditing)}
        style={{
          margin: "10px",
          padding: "10px 20px",
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          cursor: "pointer",
        }}
      >
        {isEditing ? "Preview Mode" : "Edit Mode"}
      </button>

      {/* Conditional rendering based on the mode (edit or view) */}
      {isEditing ? (
        <textarea
          value={content}
          onChange={handleChange}
          rows={20}
          style={{
            width: "100%",
            padding: "10px",
            fontSize: "16px",
            fontFamily: "'Courier New', Courier, monospace",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
      ) : (
        <Markdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            code({ inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "");
              const codeContent = String(children).replace(/\n$/, ''); // Get the code block content

              return !inline && match ? (
                <div style={{ position: "relative" }}>
                  <CopyToClipboard text={codeContent}>
                    <button
                      style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        backgroundColor: "#4CAF50",
                        color: "white",
                        border: "none",
                        padding: "5px 10px",
                        cursor: "pointer",
                      }}
                    >
                      Copy
                    </button>
                  </CopyToClipboard>
                  <pre>
                    <code className={`hljs language-${match[1]}`} {...props}>
                      {children}
                    </code>
                  </pre>
                </div>
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
      )}
    </div>
  );
}
