// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { BranchProvider } from "./context/BranchContext";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <BranchProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </BranchProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
