"use client";
import Image from "next/image";
import { ReferenceAsset } from "@/components/reference-assets";
export type CompanionPose = "sitting" | "playing" | "reading";
/** One owner-supplied pearl-white character across all pages and states. */
export function GlassCompanion({ size = "large", state = "idle", pose = "sitting" }: { size?: "large" | "small" | "mark"; state?: "idle" | "thinking" | "reply" | "welcome"; pose?: CompanionPose }) {
 return <span className={`glass-companion glass-companion--${size} companion--${state}`} data-pose={pose} aria-hidden="true">
   <span className="cat-life">
     {pose === "sitting" ? <ReferenceAsset kind="cat" className="xiaoqi-render"/> : <Image src={`/brand/xiaoqi-${pose}.png`} width={pose === "playing" ? 1017 : 965} height={793} alt="" className="xiaoqi-render" unoptimized/>}
   </span>
 </span>;
}
