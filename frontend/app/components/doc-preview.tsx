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
      className="
        font-serif text-[13px] leading-relaxed text-slate-800

        [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-center [&_h1]:mb-5 [&_h1]:text-slate-900 [&_h1]:tracking-tight
        [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-7 [&_h2]:mb-3 [&_h2]:text-slate-900
        [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-slate-800
        [&_h4]:text-xs [&_h4]:font-bold [&_h4]:mt-3 [&_h4]:mb-1 [&_h4]:text-slate-700

        [&_p]:mb-3 [&_p]:text-justify
        [&_strong]:font-bold [&_strong]:text-slate-900

        [&_ul]:mb-3 [&_ul]:pl-5 [&_ul]:list-disc
        [&_ol]:mb-3 [&_ol]:pl-5 [&_ol]:list-decimal
        [&_li]:mb-1

        [&_table]:w-full [&_table]:border-collapse [&_table]:mb-4 [&_table]:text-xs
        [&_th]:border [&_th]:border-slate-300 [&_th]:px-3 [&_th]:py-2 [&_th]:bg-slate-50 [&_th]:font-semibold [&_th]:text-left
        [&_td]:border [&_td]:border-slate-300 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top

        [&_hr]:border-slate-300 [&_hr]:my-6
        [&_a]:text-indigo-600 [&_a]:underline
        [&_blockquote]:pl-4 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-200 [&_blockquote]:text-slate-600
        [&_label]:block [&_label]:text-xs [&_label]:text-slate-400 [&_label]:mb-1

        [&_span.header_2]:font-bold [&_span.header_3]:font-bold
      "
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {rendered}
      </ReactMarkdown>
    </article>
  );
}
