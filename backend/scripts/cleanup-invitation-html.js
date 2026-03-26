const dotenv = require("dotenv");
const { PrismaClient } = require("@prisma/client");

dotenv.config();

const prisma = new PrismaClient();

function cleanOptionalInvitationHtml(value, maxLen) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned) return null;

  let html = cleaned.slice(0, maxLen);
  html = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  html = html.replace(
    /<(\/?)(p|br|strong|b|em|i|u|ul|ol|li|h1|h2|h3|blockquote|div)\b[^>]*>/gi,
    "<$1$2>"
  );

  html = html.replace(/<a\b([^>]*)>/gi, (_full, attrs) => {
    const hrefMatch = attrs.match(/href\s*=\s*("([^"]+)"|'([^']+)'|([^\s>]+))/i);
    const href = (hrefMatch && (hrefMatch[2] || hrefMatch[3] || hrefMatch[4]) ? hrefMatch[2] || hrefMatch[3] || hrefMatch[4] : "").trim();
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

async function run() {
  const events = await prisma.event.findMany({
    where: {
      invitationMessage: { not: null }
    },
    select: {
      id: true,
      invitationMessage: true
    }
  });

  let updatedCount = 0;
  for (const event of events) {
    const cleaned = cleanOptionalInvitationHtml(event.invitationMessage, 4000);
    if (cleaned !== event.invitationMessage) {
      await prisma.event.update({
        where: { id: event.id },
        data: { invitationMessage: cleaned }
      });
      updatedCount += 1;
    }
  }

  console.log(`Nettoyage termine. ${updatedCount} invitation(s) corrigee(s).`);
}

run()
  .catch(err => {
    console.error("Erreur nettoyage:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
