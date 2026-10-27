import {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockContent,
  CodeBlockLine,
} from "@/components/ui/code-block"
import { useHighlightedCode } from "@/hooks/use-highlighted-code"
import { FileCodeIcon } from "lucide-react"

interface CodeDisplayProps {
  code: string
  language?: string
  filename?: string
  lineNumbers?: boolean
}

export function CodeDisplay({
  code,
  language = "html",
  filename,
  lineNumbers = true,
}: CodeDisplayProps) {
  const normLang = (language || "html").toLowerCase().trim()
  const displayTitle = filename ?? `${normLang.toUpperCase()} Snippet`
  const lines = useHighlightedCode(code, normLang)

  return (
    <CodeBlock variant="default" className="my-3 max-w-full border border-border/80 shadow-xs overflow-hidden">
      <CodeBlockHeader className="bg-muted/40 px-3 py-2 border-b border-border/60">
        <CodeBlockTitle>
          <FileCodeIcon className="text-primary size-3.5" />
          <span className="font-mono text-xs">{displayTitle}</span>
        </CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={code} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent lineNumbers={lineNumbers} wrap>
        {Array.isArray(lines)
          ? lines.map((line, index) => (
              <CodeBlockLine key={index}>{line}</CodeBlockLine>
            ))
          : lines}
      </CodeBlockContent>
    </CodeBlock>
  )
}
