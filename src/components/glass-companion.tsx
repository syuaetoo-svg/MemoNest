"use client";
import { ReferenceAsset } from "@/components/reference-assets";
/** One owner-supplied pearl-white character across all pages and states. */
export function GlassCompanion({ size = "large", state = "idle" }: { size?: "large" | "small" | "mark"; state?: "idle" | "thinking" | "reply" | "welcome" }) {
 return <span className={`glass-companion glass-companion--${size} companion--${state}`} aria-hidden="true">
   <span className="cat-life">
     <ReferenceAsset kind="cat" className="xiaoqi-render"/>
   </span>
 </span>;
}
