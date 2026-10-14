"use client";
import Image from "next/image";
/** Every instance shares the same optimized transparent 3D character asset. */
export function GlassCompanion({ size = "large", state = "idle" }: { size?: "large" | "small" | "mark"; state?: "idle" | "thinking" | "reply" | "welcome" }) {
 return <span className={`glass-companion glass-companion--${size} companion--${state}`} aria-hidden="true">
   <span className="cat-life">
     <Image src="/brand/xiaoqi-warm.webp" alt="" width={768} height={768} sizes={size === "large" ? "(max-width: 700px) 260px, 335px" : size === "small" ? "(max-width: 700px) 103px, 170px" : "43px"} priority={size === "large"} className="xiaoqi-render"/>
     <span className="character-light-mask"><span className="character-inner-light"/></span>
   </span>
   {size !== "mark" && <span className="character-ripple"/>}
 </span>;
}
