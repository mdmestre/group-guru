import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { RootProvider } from "./providers/RootProvider";

createRoot(document.getElementById("root")!).render(
  <RootProvider>
    <App />
  </RootProvider>
);
