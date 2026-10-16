import { useId } from "react";
/** Render supplied sprite regions directly; original pixels and alpha stay intact. */
export function ReferenceAsset({ kind, className = "" }: { kind: "cat" | "sea" | "desk" | "notebook"; className?: string }) {
  const regions = { cat: "420 65 850 915", sea: "546 666 488 322", desk: "1074 666 428 322", notebook: "28 607 450 409" };
  const id = `asset-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [x, y, width, height] = regions[kind].split(" ").map(Number);
  return <svg className={className} style={{ overflow: "hidden" }} viewBox={regions[kind]} preserveAspectRatio={kind === "sea" || kind === "desk" ? "xMidYMid slice" : "xMidYMid meet"} aria-hidden="true" focusable="false"><defs><clipPath id={id}><rect x={x} y={y} width={width} height={height}/></clipPath></defs><image clipPath={`url(#${id})`} href={kind === "cat" ? "/brand/xiaoqi-reference.png" : "/brand/reference-sheet.png"} width="1536" height="1024"/></svg>;
}
