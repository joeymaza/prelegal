import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import type { DocFields } from "../lib/doc-types";
import { substituteFields } from "../lib/template-renderer";

type DocPreviewProps = {
  markdown: string;
  fields: DocFields;
};

export function DocPreview({ markdown, fields }: DocPreviewProps) {
  const rendered = substituteFields(markdown, fields);
  return (
    <article
      data-testid="doc-preview"
      className="prose prose-sm max-w-none text-[13px] leading-relaxed text-slate-800
        prose-headings:font-serif prose-headings:text-slate-900
        prose-strong:text-slate-900 prose-a:text-indigo-600
        prose-table:text-xs prose-td:border prose-td:border-slate-200 prose-td:px-2 prose-td:py-1
        prose-th:border prose-th:border-slate-200 prose-th:px-2 prose-th:py-1 prose-th:bg-slate-50"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {rendered}
      </ReactMarkdown>
    </article>
  );
}
