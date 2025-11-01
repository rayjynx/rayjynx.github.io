const { Client } = require('@notionhq/client');
const { NotionToMarkdown } = require('notion-to-md');
const { marked } = require('marked');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });

// helper
function isImageBlock(block) {
  const markdown = block?.parent;
  return markdown && typeof markdown === 'string' && markdown.startsWith('![') && markdown.includes('](');
}

exports.handler = async (event, context) => {
  const slug = event.queryStringParameters.slug;

  if (!slug) {
    return { statusCode: 400, body: 'Slug parameter is missing' };
  }

  try {
    const databaseId = process.env.NOTION_DATABASE_ID;

    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        and: [
          { property: 'Slug', rich_text: { equals: slug } },
          { property: 'Published', checkbox: { equals: true } }
        ]
      }
    });

    const postPage = response.results[0];

    if (!postPage) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'text/html' },
        body: `<!DOCTYPE html><html><body><h1>404 - Blog Post Not Found</h1></body></html>`
      };
    }

    // Convert content
    const blocksResponse = await notion.blocks.children.list({ block_id: postPage.id, page_size: 100 });
    const mdblocks = await n2m.blocksToMarkdown(blocksResponse.results);

    let postContentHtml = '';
    let currentImageGroupMarkdown = [];

    for (let i = 0; i < mdblocks.length; i++) {
      const block = mdblocks[i];
      if (isImageBlock(block)) {
        currentImageGroupMarkdown.push(block.parent);
        const next = mdblocks[i + 1];
        if (!isImageBlock(next) || i === mdblocks.length - 1) {
          postContentHtml += '<div class="blog-image-grid">';
          currentImageGroupMarkdown.forEach(m => {
            const imgHtmlWrapped = marked.parse(m);
            const imgMatch = imgHtmlWrapped.match(/<img\s+[^>]*?src=["']([^"']+)["'][^>]*?>/i);
            postContentHtml += imgMatch ? imgMatch[0] : imgHtmlWrapped;
          });
          postContentHtml += '</div>';
          currentImageGroupMarkdown = [];
        }
      } else {
        postContentHtml += marked.parse(block.parent);
      }
    }

    const postTitle = postPage.properties.Title?.title[0]?.plain_text || 'Untitled';
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head><meta charset="UTF-8"><title>${postTitle}</title></head>
      <body>${postContentHtml}</body></html>
    `;

    return { statusCode: 200, headers: { 'Content-Type': 'text/html' }, body: html };
  } catch (error) {
    return { statusCode: 500, body: 'Error: ' + error.message };
  }
};
