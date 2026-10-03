/// <reference types="filesystem-routing/types" />

import { createRouter } from "@solidjs/router";
import { fileRoutes } from "@solidjs/router/fs";
import { pageRoutes } from "virtual:file-routes";

import "./styles.css";

const Router = createRouter({
  routes: fileRoutes(pageRoutes),
});

export default function App() {
  return <Router>{(props) => <>{props.children}</>}</Router>;
}
