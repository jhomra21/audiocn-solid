import { DocsShell } from "@/site/components/docs/docs-shell";
import ParameterSliderDoc, {
  frontmatter,
} from "@/site/content/docs/components/parameter-slider.mdx";

export default function ParameterSliderPage() {
  return (
    <DocsShell
      currentPath="/docs/components/parameter-slider"
      frontmatter={frontmatter}
    >
      <ParameterSliderDoc />
    </DocsShell>
  );
}
