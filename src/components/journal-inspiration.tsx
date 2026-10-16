import { GlassSurface } from "@/components/glass";
import { Sparkles, LockKeyhole, PenLine } from "lucide-react";
/** Secondary inspiration belongs beside the writing canvas, never competing with it. */
export function JournalInspiration() {
 return <aside className="journal-inspiration"><GlassSurface material="peach" className="inspiration-float">
  <p className="eyebrow"><Sparkles size={14} aria-hidden="true"/> A LITTLE INSPIRATION</p>
  <h2>Just a little moment<br/> is enough.</h2>
  <ul><li>What made you pause today?</li><li>A thought for your future self?</li><li>What small step have you taken lately?</li></ul>
 </GlassSurface><p className="writing-boundary"><LockKeyhole size={16} aria-hidden="true"/>No AI consent is needed to save privately. Titles are optional. Edit, delete or share a summary after saving. Unsaved drafts stay on this page only.</p><div className="writing-signature"><PenLine size={18} aria-hidden="true"/><span>A small space, just for you.</span></div></aside>;
}
