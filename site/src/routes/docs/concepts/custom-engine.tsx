import { DocsShell } from "@/site/components/docs/docs-shell";
import CustomEngineDoc, {
  frontmatter,
} from "@/site/content/docs/concepts/custom-engine.mdx";

export default function CustomEnginePage() {
  return (
    <DocsShell
      currentPath="/docs/concepts/custom-engine"
      frontmatter={frontmatter}
    >
      <CustomEngineDoc />
    </DocsShell>
  );
}
