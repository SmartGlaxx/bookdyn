import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installGlobalErrorHandlers } from "@/lib/errorReporter";

// Set dark mode by default
document.documentElement.classList.add("dark");

installGlobalErrorHandlers();

createRoot(document.getElementById("root")!).render(<App />);
