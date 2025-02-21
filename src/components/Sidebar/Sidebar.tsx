import "./Sidebar.css";
import { Page } from "../../App";

import { ReactNode, useState } from "react";

function PageCell({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <li className={`sidebar_cell ${className}`} onClick={onClick}>
      {children}
    </li>
  );
}

export default function Sidebar({ pages, setSelectedPageHandler, selectedPage }: { pages: Page[]; setSelectedPageHandler: (page: Page) => void; selectedPage: Page | null }) {
  // const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [listOfPages, setListOfPages] = useState(pages);
  const [newPageTitle, setNewPageTitle] = useState("");

  const addPage = () => {
    if (newPageTitle.trim() !== "") {
      setListOfPages([...listOfPages, { title: newPageTitle }]);
      setNewPageTitle("");
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar__menu">
        <ul>
          {listOfPages.map((page, index) => (
            <PageCell
              key={index}
              onClick={() => {
                setSelectedPageHandler(page);
              }}
              className={selectedPage === page ? "selected" : ""}
            >
              {page.title}
            </PageCell>
          ))}
          <PageCell>
            <input type="text" placeholder="Add" value={newPageTitle} onChange={(e) => setNewPageTitle(e.target.value)} />
            <button onClick={addPage}>Add</button>
          </PageCell>
        </ul>
      </div>
    </div>
  );
}
