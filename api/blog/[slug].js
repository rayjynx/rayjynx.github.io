const { Client } = require('@notionhq/client');
const { NotionToMarkdown } = require('notion-to-md');
const { marked } = require('marked'); // For converting markdown to HTML

// Initialize Notion Client and NotionToMarkdown
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });


module.exports = async (req, res) => {
    const { slug } = req.query; // Get the slug from the URL path

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

        // Handle 404 Not Found
        if (!postPage) {
            res.setHeader('Content-Type', 'text/html');
            return res.status(404).send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Not Found - Your Site Name</title>
                    <link rel="stylesheet" href="/style.css"> <!-- Link to your main CSS -->
                    <link rel="preconnect" href="https://fonts.googleapis.com">
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                    <link href="https://fonts.googleapis.com/css2?family=Recursive:wght@300..1000&display=swap" rel="stylesheet">
                    <style>
                       .container { text-align: center; padding-top: 50px; }
                    </style>
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

        // Get post title
        const postTitle = postPage.properties.Title?.title[0]?.plain_text || 'Untitled Post';
        // Get post date (optional, but good for display)
         const postDate = postPage.properties.Date?.date?.start ? new Date(postPage.properties.Date.date.start).toLocaleDateString('en-US', {
             year: 'numeric',
             month: 'long',
             day: 'numeric'
         }) : '';
        // Get post tags (optional)
        const postTags = postPage.properties.Tags?.multi_select?.map(tag => tag.name) || [];


        // 2. Fetch the content blocks of the page
        const blocksResponse = await notion.blocks.children.list({
            block_id: postPage.id,
            page_size: 100, // Adjust page size as needed (max 100 per request)
        });
        const blocks = blocksResponse.results;

        // 3. Convert blocks to Markdown using notion-to-md
        const mdblocks = await n2m.blocksToMarkdown(blocks);
        
        // Manually construct the markdown string to handle potential issues in mdblocks
        let markdown = '';
        if (Array.isArray(mdblocks)) {
             // Filter out any elements that are not objects or do not have a 'parent' property
             // Then map to the 'parent' property and join with newlines
             markdown = mdblocks
                 .filter(block => block && typeof block === 'object' && typeof block.parent === 'string')
                 .map(block => block.parent)
                 .join('\n');
        } else {
             // This case should ideally not happen if blocksResponse is successful,
             // but adding logging/handling can help debug if mdblocks is something unexpected.
             console.error("Unexpected type for mdblocks:", typeof mdblocks, mdblocks);
             // Decide how to handle this - maybe set markdown to an empty string or throw a specific error
             markdown = ''; // Set to empty string to avoid errors downstream
        }

        // 4. Convert Markdown to HTML using marked (NO SANITIZATION)
        const postContentHtml = marked.parse(markdown);


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
                <title>${postTitle} - Ray Portfolio Website</title> <!-- Use your site name -->
                <link rel="stylesheet" href="/style.css"> <!-- LINK TO YOUR MAIN CSS -->
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

                <main class="container">
                    <div class="blog-post-container"> <!-- Matches the container style in your CSS -->
                        <h1>${postTitle}</h1>
                        <!-- Add meta info using your meta styles -->
                         <p class="blog-post-meta">Posted on ${postDate}</p>
                         ${postTags.length > 0 ? `<p class="blog-post-tags">Tags: ${postTags.join(', ')}</p>` : ''}

                        <div class="blog-post-content"> <!-- Matches the content style in your CSS -->
                            ${postContentHtml}
                        </div>

                        <!-- Add a back link -->
                         <p class="backlink" style="margin-top: 3rem;"><a href="/">← Back to Blog Index</a></p>

                    </div> <!-- .blog-post-container -->
                </main>

                <script src="/script.js"></script> <!-- Your existing script for menu, etc. -->
                <!-- If you use a syntax highlighter like Prism.js, include its script here -->
                 <!-- <script src="/path/to/prism.js"></script> -->

            </body>
            </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(fullHtml);

    } catch (error) {
        console.error('Error fetching blog post:', error);
        // Basic error page - you might want to make this look nicer
        res.status(500).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                 <meta charset="UTF-8">
                 <meta name="viewport" content="width=device-width, initial-scale=1.0">
                 <title>Error - Your Site Name</title>
                 <link rel="stylesheet" href="/style.css"> <!-- Link to your main CSS -->
                 <link rel="preconnect" href="https://fonts.googleapis.com">
                 <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                 <link href="https://fonts.googleapis.com/css2?family=Recursive:wght@300..1000&display=swap" rel="stylesheet">
                  <style>
                    .container { text-align: center; padding-top: 50px; }
                 </style>
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