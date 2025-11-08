const { Client } = require('@notionhq/client');
const { NotionToMarkdown } = require('notion-to-md');
const { marked } = require('marked');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });

function isImageBlock(block) {
    const markdown = block?.parent;
    return markdown && typeof markdown === 'string' && markdown.startsWith('![') && markdown.includes('](');
}

exports.handler = async (event, context) => {
    const slug = event.queryStringParameters.slug;

    if (!slug) {
        return {
            statusCode: 400,
            body: 'Slug parameter is missing'
        };
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
                 body: `
                 <!DOCTYPE html>
                 <html lang="en">
                 <head>
                     <meta charset="UTF-8">
                     <meta name="viewport" content="width=device-width, initial-scale=1.0">
                     <title>Not Found - Ray Portfolio Website</title>
                     <link rel="stylesheet" href="/style.css">
                     <link rel="preconnect" href="https://fonts.googleapis.com">
                     <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                     <link href="https://fonts.googleapis.com/css2?family=Recursive:wght@300..1000&display=swap" rel="stylesheet">
                     <style> .container { text-align: center; padding-top: 50px; } </style>
                 </head>
                 <body>
                      <nav class="navbar">
                          <div class="hamburger" onclick="toggleMenu()">☰ Menu</div>
                          <ul>
                              <li><a href="/">Home</a></li>
                              <li><a href="/portfolio.html">Portfolio</a></li>
                              <li><a href="/aboutme.html">About Me</a></li>
                              <li><a href="/contact.html">Contact</a></li>
                          </ul>
                      </nav>
                     <main class="container">
                         <h1>404 - Blog Post Not Found</h1>
                         <p>Sorry, the blog post you are looking for could not be found.</p>
                         <p><a href="/">Go back to the homepage</a></p>
                     </main>
                      <script src="/script.js"></script>
                 </body>
                 </html>
             `};
        }

        const postTitle = postPage.properties.Title?.title[0]?.plain_text || 'Untitled Post';
        const postDate = postPage.properties.Date?.date?.start ? new Date(postPage.properties.Date.date.start).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
        const postTags = postPage.properties.Tags?.multi_select?.map(tag => tag.name) || [];

        const blocksResponse = await notion.blocks.children.list({
            block_id: postPage.id,
            page_size: 100,
        });
        const blocks = blocksResponse.results;

        const mdblocks = await n2m.blocksToMarkdown(blocks);

        let postContentHtml = '';
        let currentImageGroupMarkdown = [];

        for (let i = 0; i < mdblocks.length; i++) {
            const block = mdblocks[i];

            if (isImageBlock(block)) {
                currentImageGroupMarkdown.push(block.parent);

                const nextBlock = mdblocks[i + 1];
                const nextIsImage = isImageBlock(nextBlock);

                if (!nextIsImage || i === mdblocks.length - 1) {
                     if (currentImageGroupMarkdown.length > 0) {
                         postContentHtml += '<div class="blog-image-grid">';
                         currentImageGroupMarkdown.forEach(imgMarkdown => {
                             const imgHtmlWrapped = marked.parse(imgMarkdown);
                             const imgMatch = imgHtmlWrapped.match(/<img\s+[^>]*?src=["']([^"']+)["'][^>]*?>/i);
                             if (imgMatch && imgMatch[0]) {
                                postContentHtml += imgMatch[0];
                             } else {
                                postContentHtml += imgHtmlWrapped;
                                console.warn("Could not extract <img> tag from marked output for image:", imgMarkdown);
                             }
                         });
                         postContentHtml += '</div>';
                         currentImageGroupMarkdown = [];
                     }
                }

            } else {
                 if (currentImageGroupMarkdown.length > 0) {
                      console.warn("Processing non-image block before clearing image group:", block.parent);
                      postContentHtml += '</div>';
                      currentImageGroupMarkdown = [];
                 }

                 const blockHtml = marked.parse(block.parent);
                 postContentHtml += blockHtml;
            }
        }

        const fullHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Recursive:wght@300..1000&display=swap" rel="stylesheet">

                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${postTitle} - Ray Portfolio Website</title>
                <link rel="stylesheet" href="/style.css">
            </head>
            <body>
                <nav class="navbar">
                    <div class="hamburger" onclick="toggleMenu()">☰ Menu</div>
                    <ul>
                        <li><a href="/">Home</a></li>
                        <li><a href="/portfolio.html">Portfolio</a></li>
                        <li><a href="/aboutme.html">About Me</a></li>
                        <li><a href="/contact.html">Contact</a></li>
                    </ul>
                </nav>

                <main class="blog-container">
                    <div class="blog-post-container">
                        <h1>${postTitle}</h1>
                         <p class="blog-post-meta">Posted on ${postDate}</p>
                         ${postTags.length > 0 ? `<p class="blog-post-tags">Tags: ${postTags.join(', ')}</p>` : ''}

                        <div class="blog-post-content">
                            ${postContentHtml}
                        </div>

                         <p class="backlink" style="margin-top: 3rem;"><a href="/">← Back to Blog Index</a></p>

                    </div>
                </main>

                <script src="/script.js"></script>
            </body>
            </html>
        `;

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'text/html' },
            body: fullHtml
        };

    } catch (error) {
        console.error('Error fetching blog post:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'text/html' },
            body: `
             <!DOCTYPE html>
             <html lang="en">
             <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Error - Ray Portfolio Website</title>
                  <link rel="stylesheet" href="/style.css">
                  <link rel="preconnect" href="https://fonts.googleapis.com">
                  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                  <link href="https://fonts.googleapis.com/css2?family=Recursive:wght@300..1000&display=swap" rel="stylesheet">
                   <style> .container { text-align: center; padding-top: 50px; } </style>
             </head>
             <body>
                  <nav class="navbar">
                      <div class="hamburger" onclick="toggleMenu()">☰ Menu</div>
                      <ul>
                          <li><a href="/">Home</a></li>
                          <li><a href="/portfolio.html">Portfolio</a></li>
                          <li><a href="/aboutme.html">About Me</a></li>
                          <li><a href="/contact.html">Contact</a></li>
                      </ul>
                  </nav>
                 <main class="container">
                     <h1>Error Loading Post</h1>
                     <p>There was a problem loading this blog post. Please try again later.</p>
                     <p><a href="/">Go back to the homepage</a></p>
                 </main>
                  <script src="/script.js"></script>
             </body>
             </html>
         `};
    }
};