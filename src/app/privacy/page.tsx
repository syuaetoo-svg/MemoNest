import { ExternalLink, Sparkles } from "lucide-react";
import Link from "next/link";
import { Card, PageHeading } from "@/components/ui";
export default function PrivacyPage() {
  return (
    <>
      <PageHeading eyebrow="YOUR STORY, YOUR CHOICE" title="Your journal, your choice" description="Keep a journal with or without AI. You stay in control."/>
      <Card className="privacy-reading"><div className="space-y-5 text-sm leading-7">
        <p><strong>Private entries:</strong> Saved within your Supabase account. Saving does not give Xiaoqi access. You can edit or delete an entry from its detail page.</p>
        <p><strong>Chat:</strong> After you consent on the page, your last five messages and up to three relevant, active memory summaries are sent to the configured Groq or OpenAI provider. Chat is not stored in MemoNest’s database. It stays on this page and clears when you leave or refresh. Earlier AI replies are not sent again.</p>
        <p><strong>Drafts &amp; reflections:</strong> Drafts use only your selected words. Reflections send the full text of up to eight entries you choose for that request. Check generated content before using it. Drafts are not saved automatically, and reflections do not grant long-term memory access.</p>
        <p><strong>Long-term memory:</strong> Only the summaries and source versions you confirm individually may be used. Revoking access, editing the source or deleting the entry excludes the old memory from future requests. Revocation cannot recall replies already shown or data already sent to a provider.</p>
        <p><strong>Provider processing:</strong> Requests use <code>store=false</code> and do not create persistent model sessions. This does not guarantee zero retention. Safety monitoring and other retention depend on the provider and account policies. <a className="underline text-sage-dark" href="https://developers.openai.com/api/docs/guides/your-data"><ExternalLink size={16} aria-hidden="true" className="control-icon"/>Read OpenAI’s data policy</a>. Database backup deletion follows the deployment’s retention settings.</p>
        <p>Xiaoqi is AI and may make mistakes. Source links help you check an answer; they do not guarantee accuracy. Xiaoqi does not replace real relationships or professional support.</p>
        <Link className="primary-link" href="/memories"><Sparkles size={16} aria-hidden="true" className="control-icon"/>View entries &amp; permissions</Link>
      </div></Card>
    </>
  );
}
