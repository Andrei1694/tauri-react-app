import type React from "react"
import hljs from "highlight.js"

interface Snippet {
  id: number
  title: string
  code: string
  language: string
}

interface SnippetItemProps {
  snippet: Snippet
  deleteSnippet: (id: number) => void
}

const SnippetItem: React.FC<SnippetItemProps> = ({ snippet, deleteSnippet }) => {
  const highlightedCode = hljs.highlight(snippet.code, { language: snippet.language }).value

  return (
    <div className="snippet-item">
      <h3>{snippet.title}</h3>
      <pre className="code-block">
        <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
      </pre>
      <div className="snippet-footer">
        <span className="language">{snippet.language}</span>
        <button onClick={() => deleteSnippet(snippet.id)}>Delete</button>
      </div>
    </div>
  )
}

export default SnippetItem