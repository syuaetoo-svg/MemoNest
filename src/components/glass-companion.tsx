"use client";
import { useId } from "react";

/** Original quiet glass cat. One silhouette and expression across all UI states. */
export function GlassCompanion({ size = "large", state = "idle" }: { size?: "large" | "small" | "mark"; state?: "idle" | "thinking" | "reply" | "welcome" }) {
  const id = useId().replace(/:/g, "");
  return <span className={`glass-companion glass-companion--${size} companion--${state}`} aria-hidden="true">
    <span className="cat-life">
      <svg className="xiaoqi-svg" viewBox="0 0 300 320" fill="none">
        <defs>
          <linearGradient id={`${id}-body`} x1="65" y1="50" x2="239" y2="280" gradientUnits="userSpaceOnUse">
            <stop stopColor="white" stopOpacity=".88"/><stop offset=".48" stopColor="#f5faf7" stopOpacity=".36"/><stop offset="1" stopColor="#b5d3c8" stopOpacity=".52"/>
          </linearGradient>
          <linearGradient id={`${id}-rim`} x1="80" y1="60" x2="240" y2="280" gradientUnits="userSpaceOnUse">
            <stop stopColor="white"/><stop offset=".55" stopColor="white" stopOpacity=".7"/><stop offset="1" stopColor="#8fae9f" stopOpacity=".65"/>
          </linearGradient>
          <radialGradient id={`${id}-light`}><stop stopColor="white" stopOpacity=".75"/><stop offset="1" stopColor="white" stopOpacity="0"/></radialGradient>
        </defs>
        <ellipse cx="152" cy="286" rx="65" ry="7" fill="#617e72" opacity=".1"/>
        <path d="M206 252C258 261 266 210 243 204C228 199 222 213 231 220" stroke={`url(#${id}-rim)`} strokeWidth="17" strokeLinecap="round"/>
        <path d="M90 117C82 98 77 66 84 53C90 48 114 68 124 82C141 77 160 77 178 82C190 68 211 49 217 55C223 68 216 100 210 116C226 137 229 159 217 184C225 207 230 247 215 265C201 280 178 272 151 273C125 273 98 280 84 264C70 248 77 209 85 184C72 160 75 137 90 117Z" fill={`url(#${id}-body)`} stroke={`url(#${id}-rim)`} strokeWidth="2"/>
        <ellipse cx="127" cy="139" rx="54" ry="60" fill={`url(#${id}-light)`}/>
        <path d="M89 63L99 99M208 64L198 99" stroke="white" strokeOpacity=".58" strokeWidth="3" strokeLinecap="round"/>
        <path d="M92 137C89 147 89 157 92 164" stroke="white" strokeOpacity=".8" strokeWidth="4" strokeLinecap="round"/>
        <path d="M118 146L124 146M177 146L183 146" stroke="#4b665c" strokeWidth="3" strokeLinecap="round"/>
        <path d="M148 159L152 159L150 161Z" fill="#7f978b"/>
        <path d="M133 236L131 258M168 236L170 258" stroke="#8fae9f" strokeOpacity=".3" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </span>
  </span>;
}
