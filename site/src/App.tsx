/// <reference types="filesystem-routing/types" />

import { createRouter } from "@solidjs/router";
import { fileRoutes } from "@solidjs/router/fs";
import { Errored } from "solid-js";
import { pageRoutes } from "virtual:file-routes";

import { ErrorPage } from "@/site/components/docs/page-state";
import { ThemeHotkey } from "@/site/components/docs/theme-controls";

import "./styles.css";

const Router = createRouter({
  routes: fileRoutes(pageRoutes),
});

export default function App() {
  return (
    <Router>
      {(props) => (
        <>
          <ThemeHotkey />
          <Errored fallback={(error) => <ErrorPage error={error()} />}>
            {props.children}
          </Errored>
        </>
      )}
    </Router>
  );
}
