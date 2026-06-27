import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import DashboardPage from "../app/page";
import "../app/styles.css";
import "../app/qr-studio.css";
import "../app/racks.css";
import "../app/cables.css";
import "../app/assets.css";
import "../app/mobile.css";
import "../app/command.css";
import "../app/system.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DashboardPage />
  </StrictMode>
);
