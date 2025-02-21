import type React from "react"
import SnippetItem from "./SnippetItem"

interface Snippet {
  id: number
  title: string
  code: string
  language: string
}

interface SnippetListProps {
  snippets: Snippet[]
  deleteSnippet: (id: number) => void
}

const SnippetList: React.FC<SnippetListProps> = ({ snippets, deleteSnippet }) => {
  return (
    <div className="snippet-list">
      {snippets.map((snippet) => (
        <SnippetItem key={snippet.id} snippet={snippet} deleteSnippet={deleteSnippet} />
      ))}
    </div>
  )
}

export default SnippetList

