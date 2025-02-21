import "./App.css";
import { register } from '@tauri-apps/plugin-global-shortcut';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEffect, useState } from "react";
import hljs from "highlight.js"
import "highlight.js/styles/github-dark.css" // Changed to dark theme
import "./App.css"
import SnippetForm from "./components/SnippetForm"
import SnippetList from "./components/SnippetList"

interface Snippet {
  id: number
  title: string
  code: string
  language: string
}
function App() {
  const [windowVisible, setWindowVisible] = useState(false); // Track window visibility
  const [snippets, setSnippets] = useState<Snippet[]>([])

    useEffect(() => {
		    shortcuts();
    hljs.highlightAll()
  }, [])

    const addSnippet = (newSnippet: Omit<Snippet, "id">) => {
    setSnippets([...snippets, { ...newSnippet, id: Date.now() }])
  }

  const deleteSnippet = (id: number) => {
    setSnippets(snippets.filter((snippet) => snippet.id !== id))
  }

  // Function to register the shortcut
  async function shortcuts() {
    await register('CommandOrControl+Shift+C', pressEventHandler);
  }

  const pressEventHandler = async (e) => {
    try {
      const window = await getCurrentWindow(); // Make sure this returns the correct window object
      if (!window) {
        console.error('Window not found');
        return;
      }

      const isVisible = await window.isVisible();
      console.log('Window visibility:', isVisible);

      if (e.state === 'Pressed') {
        console.log('Button Pressed');
        if (isVisible) {
          // Hide window if it's visible
          await window.hide();
          console.log('Window is now hidden');
          setWindowVisible(false); // Update visibility state
        } else {
          // Show window if it's hidden
          await window.show();
          console.log('Window is now visible');
          setWindowVisible(true); // Update visibility state
        }
      }
    } catch (error) {
      console.error('Error handling press event:', error);
    }
  };



  return (
   <div className="app">
      <h1>Code Snippet Repository</h1>
      <SnippetForm addSnippet={addSnippet} />
      <SnippetList snippets={snippets} deleteSnippet={deleteSnippet} />
    </div>
  );
}

export default App;
