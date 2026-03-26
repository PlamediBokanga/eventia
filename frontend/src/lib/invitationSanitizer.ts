export function sanitizeInvitationHtml(input: string) {
  if (!input) return "";
  let html = input.trim().slice(0, 4000);
  if (!html) return "";

  html = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  html = html.replace(
    /<(\/?)(p|br|strong|b|em|i|u|ul|ol|li|h1|h2|h3|blockquote|div)\b[^>]*>/gi,
    "<$1$2>"
  );

  html = html.replace(/<a\b([^>]*)>/gi, (_full, attrs: string) => {
    const hrefMatch = attrs.match(/href\s*=\s*("([^"]+)"|'([^']+)'|([^\s>]+))/i);
    const href = (hrefMatch?.[2] || hrefMatch?.[3] || hrefMatch?.[4] || "").trim();
    const safeHref = /^(https?:|mailto:|tel:)/i.test(href) ? href : "#";
    return `<a href="${safeHref}" target="_blank" rel="noreferrer">`;
  });

  html = html.replace(/<\/a>/gi, "</a>");
  html = html.replace(/<(?!\/?(p|br|strong|b|em|i|u|ul|ol|li|h1|h2|h3|blockquote|a|div)\b)[^>]*>/gi, "");
  html = html.replace(/&lt;\//gi, "");
  html = html.replace(/<\/(?!p|strong|b|em|i|u|ul|ol|li|h1|h2|h3|blockquote|a|div)\w+>/gi, "");
  html = html.replace(/<div>\s*<\/div>/gi, "");
  html = html.replace(/\s{3,}/g, " ");
  html = html.replace(/\n{3,}/g, "\n\n");

  return html;
}
