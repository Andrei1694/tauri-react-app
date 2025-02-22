import "./Sidebar.css";
import { Page } from "../../App";
import { ReactNode, useState } from "react";
import useStore from "../../store/useStore";

function PageCell({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <li className={`sidebar_cell ${className}`} onClick={onClick}>
      {children}
    </li>
  );
}

export default function Sidebar({
  pages,
  setSelectedPageHandler,
  selectedPage,
}: {
  pages: Page[];
  setSelectedPageHandler: (page: Page) => void;
  selectedPage: Page | null;
}) {
  const [listOfPages, setListOfPages] = useState(pages);
  const [newPageTitle, setNewPageTitle] = useState("");
	const {files, setSelectedFile, selectedFile} = useStore()
  // Add page function
  const addPage = () => {
    if (newPageTitle.trim() !== "") {
      const newPage: Page = { title: newPageTitle };
      setListOfPages((prevPages) => [...prevPages, newPage]);
      setNewPageTitle("");
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar__menu">
        <ul>
          {files.map((file, index) => (
            <PageCell
              key={file.title} // Use a unique identifier (title here)
              onClick={() => {
                setSelectedFile(file);
              }}
              className={selectedFile?.title === file.title ? "selected" : ""} // Compare titles for equality
            >
              {file.title}
            </PageCell>
          ))}
          <PageCell>
            <input
              type="text"
              placeholder="Add page title"
              value={newPageTitle}
              onChange={(e) => setNewPageTitle(e.target.value)}
            />
            <button onClick={addPage} disabled={newPageTitle.trim() === ""}>
              Add
            </button>
          </PageCell>
        </ul>
      </div>
    </div>
  );
}
