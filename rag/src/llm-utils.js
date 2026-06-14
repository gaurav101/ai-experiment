export function parseModelResponse(bodyText) {
  // Try to parse JSON then extract a single coherent text output
  if (!bodyText) return "";
  let data;
  try {
    data = JSON.parse(bodyText);
  } catch (e) {
    return String(bodyText).trim();
  }

  function extract(d) {
    if (!d && d !== 0) return "";
    if (typeof d === "string") return d;
    // common single fields
    if (d.output_text) return d.output_text;
    if (d.text) return d.text;
    if (d.response) return d.response;
    if (d.result) {
      if (Array.isArray(d.result)) return d.result.join(" ");
      return String(d.result);
    }
    // choices style
    if (d.choices && Array.isArray(d.choices) && d.choices[0]) {
      const c = d.choices[0];
      if (c.message?.content) return c.message.content;
      if (c.text) return c.text;
    }
    // data array
    if (Array.isArray(d) && d[0]) return extract(d[0]);
    if (d.data && Array.isArray(d.data) && d.data[0]) {
      const first = d.data[0];
      if (first.content) return first.content;
      if (first.text) return first.text;
      if (first.embedding) return String(first.embedding);
    }
    // fallback to JSON string
    return JSON.stringify(d, null, 2);
  }

  const out = extract(data);
  // normalize whitespace into a single trimmed string
  return String(out).replace(/[\n\r]+/g, "\n").trim();
}
