"use client"

import type React from "react"
import { useState } from "react"

interface SnippetFormProps {
  addSnippet: (snippet: { title: string; code: string; language: string }) => void
}

const languageOptions = [
  "javascript",
  "python",
  "java",
  "c",
  "cpp",
  "csharp",
  "ruby",
  "go",
  "rust",
  "php",
  "swift",
  "kotlin",
  "typescript",
  "html",
  "css",
  "sql",
]

const SnippetForm: React.FC<SnippetFormProps> = ({ addSnippet }) => {
  const [title, setTitle] = useState("")
  const [code, setCode] = useState("")
  const [language, setLanguage] = useState(languageOptions[0])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (title && code && language) {
      addSnippet({ title, code, language })
      setTitle("")
      setCode("")
      setLanguage(languageOptions[0])
    }
  }

  return (
    <form onSubmit={handleSubmit} className="snippet-form">
      <input
        type="text"
        placeholder="Snippet Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <textarea placeholder="Code Snippet" value={code} onChange={(e) => setCode(e.target.value)} required />
      <select value={language} onChange={(e) => setLanguage(e.target.value)} required>
        {languageOptions.map((lang) => (
          <option key={lang} value={lang}>
            {lang.charAt(0).toUpperCase() + lang.slice(1)}
          </option>
        ))}
      </select>
      <button type="submit">Add Snippet</button>
    </form>
  )
}

export default SnippetForm

