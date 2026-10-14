/** Decorative, code-native identity for Xiaoqi. No external assets or data. */
export function GlassCompanion({ size = "large" }: { size?: "large" | "small" | "mark" }) {
  return <span className={`glass-companion glass-companion--${size}`} aria-hidden="true">
    <span className="companion-orbit" /><span className="companion-body"><span className="companion-heart" /><span className="companion-glint" /></span>
  </span>;
}
