import { GlassSurface } from "@/components/glass";
import { Sparkles, LockKeyhole, PenLine } from "lucide-react";
/** Secondary inspiration belongs beside the writing canvas, never competing with it. */
export function JournalInspiration() {
 return <aside className="journal-inspiration"><GlassSurface material="peach" className="inspiration-float">
  <p className="eyebrow"><Sparkles size={14} aria-hidden="true"/> A LITTLE INSPIRATION</p>
  <h2>不用写完整，<br/>一个瞬间就很好。</h2>
  <ul><li>今天，什么让你停下了脚步？</li><li>有没有一句话，想留给未来的自己？</li><li>最近的一次小小进步是什么？</li></ul>
 </GlassSurface><p className="writing-boundary"><LockKeyhole size={16} aria-hidden="true"/>私人保存不需要 AI 授权。标题可空；保存后可以编辑、删除或逐条授权摘要。未保存草稿只留在当前页面。</p><div className="writing-signature"><PenLine size={18} aria-hidden="true"/><span>A small space, just for you.</span></div></aside>;
}
