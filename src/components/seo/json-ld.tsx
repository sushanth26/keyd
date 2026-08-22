// Renders a JSON-LD <script> tag. Escapes "<" so the payload can never break out of
// the script element (defense against injected content in listing text).
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
