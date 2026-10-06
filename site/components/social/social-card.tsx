import { dynamic } from "@solidjs/web";
import { createSignal, onSettled } from "solid-js";

import { socialPreviews } from "@/site/components/social/social-previews";
import { siteConfig } from "@/site/lib/site";
import type { SocialCardDefinition } from "@/site/lib/social-catalog";

import styles from "./social-card.module.css";

export const SocialCard = (props: { card: SocialCardDefinition }) => {
  const [ready, setReady] = createSignal(false);
  const Preview = dynamic(() => socialPreviews[props.card.preview]);

  onSettled(() => {
    setReady(true);
  });

  return (
    <article
      class={styles.card}
      data-social-card={props.card.id}
      data-social-kind={
        props.card.pathname.includes("/hooks/") ? "hook" : "page"
      }
      data-social-long-title={String(props.card.title.length > 24)}
      data-social-ready={String(ready())}
      data-theme="stone"
    >
      <header class={styles.header}>
        <div class={styles.brand}>
          <img
            alt=""
            class="size-9 dark:invert"
            height="36"
            src="/brand/logo.svg"
            width="36"
          />
          <span>audiocn</span>
        </div>
        <span class={styles.headerLabel}>SOLID + SHADCN/UI</span>
      </header>
      <div class={styles.body}>
        <div class={styles.copy}>
          <p class={styles.category}>{props.card.category}</p>
          <h1 class={styles.title}>{props.card.title}</h1>
          <p class={styles.caption}>{props.card.caption}</p>
        </div>
        <figure class={styles.stage}>
          <div class={styles.preview} data-social-preview={props.card.preview}>
            <Preview />
          </div>
          <figcaption class="sr-only">{props.card.alt}</figcaption>
        </figure>
      </div>
      <footer class={styles.footer}>
        <span>COPY. PASTE. OWN.</span>
        <span>{new URL(siteConfig.url).host}</span>
      </footer>
    </article>
  );
};
