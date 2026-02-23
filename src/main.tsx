import { createRoot } from "react-dom/client";
import { captureUtmParams } from "./lib/utm";
import App from "./App.tsx";
import "./index.css";

// Capture UTM params IMMEDIATELY before any React rendering or routing
// This ensures UTMs from email CTAs are saved before ProtectedRoute redirects strip them
captureUtmParams();

createRoot(document.getElementById("root")!).render(<App />);
