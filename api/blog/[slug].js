const { Client } = require('@notionhq/client');
const { NotionToMarkdown } = require('notion-to-md');
const { marked } = require('marked');

// Initialize Notion Client and NotionToMarkdown
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });

// Helper function to check if a block is an image markdown block
function isImageBlock(block) {
    const markdown = block?.parent;
    return markdown && typeof markdown === 'string' && markdown.startsWith('![') && markdown.includes('](');
}


module.exports = async (req, res) => {
    const { slug } = req.query;

    if (!slug) {
        return res.status(400).send('Slug parameter is missing');
    }

    try {
        const databaseId = process.env.NOTION_DATABASE_ID;

        // 1. Find the Notion page with the matching slug
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

        // Handle 404 Not Found (Keep your existing 404 HTML here)
        if (!postPage) {
             // ... (Your 404 HTML response) ...
             res.setHeader('Content-Type', 'text/html');
             return res.status(404).send(`
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
             `);
        }

        const postTitle = postPage.properties.Title?.title[0]?.plain_text || 'Untitled Post';
        const postDate = postPage.properties.Date?.date?.start ? new Date(postPage.properties.Date.date.start).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
        const postTags = postPage.properties.Tags?.multi_select?.map(tag => tag.name) || [];


        // 2. Fetch the content blocks of the page
        const blocksResponse = await notion.blocks.children.list({
            block_id: postPage.id,
            page_size: 100,
        });
        const blocks = blocksResponse.results;

        // 3. Convert blocks to Markdown using notion-to-md
        const mdblocks = await n2m.blocksToMarkdown(blocks);

        // 4. Manually process mdblocks array to group consecutive images for grid layout
        let postContentHtml = '';
        let currentImageGroupMarkdown = []; // Array to hold markdown strings for current image group

        for (let i = 0; i < mdblocks.length; i++) {
            const block = mdblocks[i];

            if (isImageBlock(block)) {
                // Add image markdown to the current group
                currentImageGroupMarkdown.push(block.parent);

                const nextBlock = mdblocks[i + 1];
                const nextIsImage = isImageBlock(nextBlock);

                // If the next block is NOT an image, or this is the last block,
                // process the collected image group
                if (!nextIsImage || i === mdblocks.length - 1) {
                     if (currentImageGroupMarkdown.length > 0) {
                         // Start the grid container HTML
                         postContentHtml += '<div class="blog-image-grid">';
                         // Add HTML for each image in the group
                         currentImageGroupMarkdown.forEach(imgMarkdown => {
                             // Marked converts ![alt](src) to <p><img src="..." alt="..."></p>
                             // We only want the <img> tag, so we parse and extract it.
                             // A regex could also work, but parsing is more robust.
                             const imgHtmlWrapped = marked.parse(imgMarkdown);
                             // Basic extraction - finds the first img tag. Adjust if marked output changes.
                             const imgMatch = imgHtmlWrapped.match(/<img\s+[^>]*?src=["']([^"']+)["'][^>]*?>/i);
                             if (imgMatch && imgMatch[0]) {
                                postContentHtml += imgMatch[0]; // Add just the <img> tag
                             } else {
                                // Fallback if parsing fails - add the wrapped HTML or a placeholder
                                postContentHtml += imgHtmlWrapped;
                                console.warn("Could not extract <img> tag from marked output for image:", imgMarkdown);
                             }
                         });
                         // Close the grid container HTML
                         postContentHtml += '</div>';
                         // Clear the group for the next sequence
                         currentImageGroupMarkdown = [];
                     }
                }

            } else {
                 // This is a non-image block
                 // Ensure any pending image group is closed (should be handled by the logic above, but a safeguard)
                 if (currentImageGroupMarkdown.length > 0) {
                      console.warn("Processing non-image block before clearing image group:", block.parent);
                      // Close the grid if an image group wasn't properly closed
                      postContentHtml += '</div>';
                      currentImageGroupMarkdown = [];
                 }

                 // Convert the non-image block markdown to HTML using marked
                 const blockHtml = marked.parse(block.parent);
                 postContentHtml += blockHtml;
            }
        }


        // 5. Construct the full HTML page, incorporating your existing structure and CSS classes
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
                <!-- If you use a syntax highlighter like Prism.js, link its CSS here -->
                <!-- <link rel="stylesheet" href="/path/to/prism.css"> -->

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
                            ${postContentHtml} <!-- Inject the processed HTML here -->
                        </div>

                         <p class="backlink" style="margin-top: 3rem;"><a href="/">← Back to Blog Index</a></p>

                    </div> <!-- .blog-post-container -->
                </main>

                <script src="/script.js"></script>
                <!-- If you use a syntax highlighter like Prism.js, include its script here -->
                <!-- <script src="/path/to/prism.js"></script> -->

            </body>
            </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(fullHtml);

    } catch (error) {
        console.error('Error fetching blog post:', error);
        // Basic error page (Keep your existing error HTML here)
        res.status(500).send(`
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
                          <li><a href="/contact.html">Contact</li>
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
         `);
    }
}