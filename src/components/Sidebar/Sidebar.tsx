import { useMemo, useState } from "react";
import useStore from "../../store/useStore";
import "./Sidebar.css";

export default function Sidebar() {
  const files = useStore((state) => state.files);
  const selectedFile = useStore((state) => state.selectedFile);
  const setSelectedFile = useStore((state) => state.setSelectedFile);
  const [query, setQuery] = useState("");

  const filteredFiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return files;
    }

    return files.filter((file) => {
      return (
        file.title.toLowerCase().includes(normalizedQuery) || file.path.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [files, query]);

  return (
    <aside className="doc-sidebar" aria-label="Document navigation">
      <header className="doc-sidebar__header">
        <h2>Documents</h2>
        <p>{files.length} available</p>
      </header>

      <label className="doc-sidebar__search" htmlFor="doc-search">
        <span>Search</span>
        <input
          id="doc-search"
          type="search"
          placeholder="Find by title or path"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <ul className="doc-sidebar__list">
        {filteredFiles.map((file) => {
          const isSelected = selectedFile?.path === file.path;

          return (
            <li key={file.path}>
              <button
                type="button"
                className={`doc-sidebar__item ${isSelected ? "is-selected" : ""}`}
                onClick={() => setSelectedFile(file)}
              >
                <span className="doc-sidebar__title">{file.title}</span>
                <span className="doc-sidebar__path">{file.path}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {!filteredFiles.length && <p className="doc-sidebar__empty">No documents match this search.</p>}
    </aside>
  );
}

