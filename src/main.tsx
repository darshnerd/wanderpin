import { createRoot } from "react-dom/client";

import "./index.css";
import App from "./App";
import { EmbedView } from "./components/EmbedView";

const embed = location.pathname.match(/^\/embed\/([A-Za-z0-9]+)$/);

createRoot(document.getElementById("root")!).render(
  embed ? <EmbedView slug={embed[1]} /> : <App />,
);
