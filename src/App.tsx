
import "./App.css";
import { register } from '@tauri-apps/plugin-global-shortcut';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEffect } from "react";
function App() {

async function shorcuts() {
	await register('CommandOrControl+Shift+C', async () => {
  // Get the current window visibility state
  const window = getCurrentWindow();
  const isVisible = await window.isVisible()
	console.log(isVisible)
  // Toggle the window visibility
  if (isVisible) {
    await window.hide(); // Hide the window if it's currently visible
  } else {
    await window.show(); // Show the window if it's currently hidden
  }
})}

useEffect(() => {
	shorcuts()
}
,[])

  return (
    <main className="container">
Test
    </main>
  );
}

export default App;
