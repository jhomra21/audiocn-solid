import {
  mkdtemp,
  readFile,
  writeFile,
  realpath,
  symlink,
  readdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import tailwind from "@tailwindcss/vite";
import { createServer } from "vite";

const root = resolve(import.meta.dirname, "../..");

const referencePath = process.env.AUDIOCN_UPSTREAM_SOURCE;

if (!referencePath)
  throw new Error("Set AUDIOCN_UPSTREAM_SOURCE to the pinned React checkout.");

const reference = await realpath(referencePath);

const temporary = await realpath(
  await mkdtemp(join(tmpdir(), "audiocn-paired-fixtures-"))
);

const reactSource = await readFile(
  join(reference, "app/(home)/contributors/page.tsx"),
  "utf8"
);

const solidSource = await readFile(
  join(root, "site/src/routes/contributors.tsx"),
  "utf8"
);

const reactStart = reactSource.indexOf("const ContributorCard =");

const reactEnd = reactSource.indexOf("\n};", reactStart) + 3;

const solidStart = solidSource.indexOf(
  '<a\n                        class="group hover:'
);

const solidEnd = solidSource.indexOf("</a>", solidStart) + 4;

if (reactStart < 0 || reactEnd < 3 || solidStart < 0 || solidEnd < 4)
  throw new Error(
    "Contributor owner changed; update the exact source extraction."
  );

// Execute the actual upstream card, not a hand-written approximation. Only its
// surrounding server page is removed; Next Image and Phosphor remain native.
const cards = {
  react: `import Image from "next/image"; import {ArrowSquareOutIcon} from "@phosphor-icons/react/dist/ssr";
    const AVATAR_SIZE_PX=48; const numberFormatter=new Intl.NumberFormat("en-US");
    ${reactSource.slice(reactStart, reactEnd)}`,
  solid: `import {DocsIcon} from "@/site/components/docs/phosphor-icons"; const format=new Intl.NumberFormat("en-US");
    const ContributorCard=(props)=>{const contributor=props.contributor;const index=()=>props.rank-1;
      return (${solidSource.slice(solidStart, solidEnd)});};`,
};

const componentImports = `
import {ElectricBarVisualizer} from "@/components/ui/electric-bar-visualizer";
import {ElectricWaveform} from "@/components/ui/electric-waveform";
import {SmoothWaveform} from "@/components/ui/smooth-waveform";
import {LiveWaveform} from "@/components/ui/live-waveform";
import {Spectrum,SpectrumCanvas} from "@/components/ui/spectrum";
import {Tabs,TabsList,TabsTrigger,TabsContent} from "@/components/ui/tabs";
import {Popover,PopoverTrigger,PopoverContent} from "@/components/ui/popover";
import {Badge} from "@/components/ui/badge";
import {createFrameEmitter} from "@/lib/audio/frame-source";
`;

const exampleNames = (await readdir(join(root, "components/examples"))).flatMap(
  (name) => (name.endsWith(".tsx") ? [name.slice(0, -4)] : [])
);

const content = `
const source=createFrameEmitter();
const params=new URLSearchParams(location.search);
const variant=params.get("variant")??"bars";
const mode=params.get("mode")??"static";
const width=Number(params.get("width")??256);
const style={width:width+"px",height:"80px"};
const contributor={login:params.get("login")??"fixture-user",contributions:Number(params.get("commits")??1234),
  profileUrl:"https://github.com/fixture-user",avatarUrl:"/avatar.svg"};
const example=params.get("name");
if(example&&!${JSON.stringify(exampleNames)}.includes(example))throw new Error("Unknown example fixture");
const module=example?await import(/* @vite-ignore */ "/@fs"+${JSON.stringify(root)}+"/components/examples/"+example+".tsx"):null;
const named=example?.split("-").map(part=>part[0].toUpperCase()+part.slice(1)).join("");
const Example=module?(module.default??module[named]):null;
if(example&&!Example)throw new Error("Missing actual example export: "+example);
window.paired={emit:(frame)=>source.emit({...frame,bands:Float32Array.from(frame.bands),
  history:Float32Array.from(frame.history)}),ready:false};
const Fixture=()=>{
  if(Example)return <Example/>;
  if(params.get("family")==="tabs")return <Tabs defaultValue={params.has("no-default")?undefined:"first"}>
    <TabsList><TabsTrigger value="first">First</TabsTrigger><TabsTrigger value="second">Second</TabsTrigger>
    <TabsTrigger value="disabled" disabled>Disabled</TabsTrigger></TabsList>
    <TabsContent value="first">First panel</TabsContent><TabsContent value="second">Second panel</TabsContent></Tabs>;
  if(params.get("family")==="popover")return <Popover><PopoverTrigger onClick={event=>params.has("native")?event.preventDefault():event.preventBaseUIHandler?.()}>
    Prevent opening</PopoverTrigger><PopoverContent>Popup</PopoverContent></Popover>;
  if(params.get("family")==="contributor")return <div style={{width:width+"px"}}><ContributorCard contributor={contributor} rank={1}/></div>;
  if(params.get("family")==="electric-bars")return <ElectricBarVisualizer source={source} style={style} barCount={8}/>;
  if(params.get("family")==="electric-waveform")return <ElectricWaveform source={source} style={style} mode={mode}/>;
  if(params.get("family")==="smooth")return <SmoothWaveform source={source} style={style} mode={mode}/>;
  if(params.get("family")==="live")return <LiveWaveform source={source} style={style} variant={variant} mode={mode}/>;
  return <Spectrum source={source} variant={variant} grid={false} peakHold={false} style={style}><SpectrumCanvas style={style}/></Spectrum>;
};`;

for (const runtime of ["react", "solid"] as const) {
  const directory = join(temporary, runtime);
  await Bun.write(
    join(directory, "index.html"),
    '<html><head></head><body><main id="root"></main><script type="module" src="/entry.tsx"></script></body></html>'
  );
  await symlink(
    join(runtime === "react" ? reference : root, "node_modules"),
    join(directory, "node_modules"),
    "dir"
  );
  await writeFile(
    join(directory, "entry.tsx"),
    `${
      runtime === "react"
        ? 'import React from "react"; import {createRoot} from "react-dom/client";'
        : 'import {render} from "solid-js/web";'
    }
    ${componentImports}${cards[runtime]}${runtime === "react" ? content.replace(JSON.stringify(root), JSON.stringify(reference)) : content}
    import "./style.css";
    ${runtime === "react" ? 'const owner=createRoot(document.getElementById("root"));owner.render(<Fixture/>);' : 'const dispose=render(()=> <Fixture/>,document.getElementById("root"));'}
    window.paired.dispose=()=>${runtime === "react" ? "owner.unmount()" : "dispose()"};
    window.paired.ready=true;`
  );
  await writeFile(
    join(directory, "style.css"),
    `@import "${join(root, "app/styles.css")}";
    @source "${join(reference, "components/ui")}";
    @source "${directory}";
    body{margin:0;padding:16px;} #root{font-family:"DM Sans Variable";}
  `
  );
}

const localConfig = (await import(join(root, "vite.config.ts"))).default;

const solidServer = await createServer({
  ...localConfig,
  configFile: false,
  root: join(temporary, "solid"),
  publicDir: join(root, "site/public"),
  server: {
    host: "127.0.0.1",
    port: 4502,
    strictPort: true,
    fs: { allow: [root, reference, temporary] },
  },
});

const { createServer: createReactServer } = await import(
  pathToFileURL(join(reference, "node_modules/vite/dist/node/index.js")).href
);

const react = (
  await import(
    pathToFileURL(
      join(reference, "node_modules/@vitejs/plugin-react/dist/index.js")
    ).href
  )
).default;

const reactServer = await createReactServer({
  configFile: false,
  root: join(temporary, "react"),
  publicDir: join(reference, "public"),
  optimizeDeps: {
    entries: [
      join(temporary, "react/entry.tsx"),
      join(reference, "components/examples/*.tsx"),
    ],
  },
  plugins: [react(), tailwind()],
  define: {
    "process.env.__NEXT_IMAGE_OPTS": "undefined",
    "process.env.NEXT_DEPLOYMENT_ID": "undefined",
    "process.env.NEXT_SUPPORTS_IMMUTABLE_ASSETS": "false",
    "process.env.NEXT_RUNTIME": "undefined",
  },
  resolve: { alias: { "@": reference }, dedupe: ["react", "react-dom"] },
  server: {
    host: "127.0.0.1",
    port: 4501,
    strictPort: true,
    fs: { allow: [root, reference, temporary] },
  },
});

await Promise.all([solidServer.listen(), reactServer.listen()]);

console.info(
  `Paired actual-source fixtures: React :4501, Solid 1 :4502; temporary sources ${temporary}`
);

const stop = async () => {
  await Promise.all([solidServer.close(), reactServer.close()]);
  process.exit(0);
};

process.on("SIGINT", () => void stop());

process.on("SIGTERM", () => void stop());
