import { ExternalLink, Sparkles } from "lucide-react";
import Link from "next/link";
import { Card, PageHeading } from "@/components/ui";
export default function PrivacyPage() {
  return (
    <>
      <PageHeading
        eyebrow="YOUR STORY, YOUR CHOICE"
        title="记录与记忆，由你决定"
        description="你可以只写日记，也可以选择使用 AI。两种方式都能留下生活。"
      />
      <Card className="privacy-reading">
        <div className="space-y-5 text-sm leading-7">
          <p>
            <strong>私人记录：</strong>保存在你的 Supabase
            账号范围内，保存不会自动授权小栖使用。你可以在详情编辑和删除。
          </p>
          <p>
            <strong>聊天：</strong>勾选本页处理同意后，最近 5 条用户表达及最多 3
            条相关有效授权摘要会发送至服务端配置的 Groq 或 OpenAI。聊天不写入 MemoNest
            数据库，只留在当前页面；离开或刷新清除。过去 AI 回复不重新发送。
          </p>
          <p>
            <strong>整理和回顾：</strong>
            整理只发送所选用户原话；回顾只发送你本次选定的最多 8
            篇记录全文。生成结果需核实，候选不自动保存，回顾不产生长期授权。
          </p>
          <p>
            <strong>长期记忆：</strong>
            只允许你逐条确认的摘要和版本。撤回、修改来源或删除记录会使旧记忆不可供后续调用。已展示的回复、已发给服务商的内容不能通过撤回追回。
          </p>
          <p>
            <strong>服务商处理：</strong>应用请求设置 store=false，不创建持久
            模型会话。这不等于零保留；安全监控等保留取决于服务商和账号政策。
            <a
              className="underline text-sage-dark"
              href="https://developers.openai.com/api/docs/guides/your-data"
            ><ExternalLink size={16} aria-hidden="true" className="control-icon"/>
              阅读 OpenAI 数据政策
            </a>
            。数据库备份的删除时效取决于部署配置。
          </p>
          <p>
            小栖是
            AI，可能出错；来源链接用于核对，不代表生成内容绝对正确。它不替代现实关系或专业支持。
          </p>
          <Link className="primary-link" href="/memories"><Sparkles size={16} aria-hidden="true" className="control-icon"/>
            查看记录和授权
          </Link>
        </div>
      </Card>
    </>
  );
}
