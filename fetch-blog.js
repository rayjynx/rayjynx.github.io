// fetch-blog.js - This will be used during development to generate static files
const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

// Initialize Notion client
const notion = new Client({ auth: 'your_notion_integration_token' });
const DATABASE_ID = 'your_notion_database_id';

async function fetchAndGenerateBlog() {
    try {
        // Fetch all published posts from Notion
        const response = await notion.databases.query({
            database_id: DATABASE_ID,
            filter: {
                property: 'Published',
                checkbox: {
                    equals: true
                }
            },
            sorts: [{
                property: 'Date',
                direction: 'descending'
            }]
        });

        // Create blog directory if it doesn't exist
        const blogDir = path.join(__dirname, 'blog');
        if (!fs.existsSync(blogDir)) {
            fs.mkdirSync(blogDir);
        }

        // Generate index data file
        const indexData = response.results.map(post => {
            const title = post.properties.Title?.title[0]?.plain_text || 'Untitled';
            const slug = post.properties.Slug?.rich_text[0]?.plain_text || '';
            const date = post.properties.Date?.date?.start || '';
            const tags = post.properties.Tags?.multi_select?.map(tag => tag.name) || [];
            
            return { title, slug, date, tags };
        });

        fs.writeFileSync(
            path.join(__dirname, 'blog', 'index.json'),
            JSON.stringify(indexData, null, 2)
        );

        console.log('Generated blog index data');

        // Generate individual post files
        for (const post of response.results) {
            const title = post.properties.Title?.title[0]?.plain_text || 'Untitled';
            const slug = post.properties.Slug?.rich_text[0]?.plain_text || '';
            const date = post.properties.Date?.date?.start || '';
            const tags = post.properties.Tags?.multi_select?.map(tag => tag.name) || [];
            
            // Fetch the page content
            const blocks = await notion.blocks.children.list({
                block_id: post.id
            });
            
            // Convert blocks to HTML (simplified - you might want a proper converter)
            let content = '';
            for (const block of blocks.results) {
                if (block.type === 'paragraph') {
                    content += `<p>${block.paragraph.rich_text[0]?.plain_text || ''}</p>`;
                }
                // Add more block types as needed
            }
            
            const postHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Recursive:wght@300..1000&display=swap" rel="stylesheet">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Ray Portfolio Website</title>
    <link rel="stylesheet" href="../style.css">
</head>
<body>
    <nav class="navbar">
        <div class="hamburger" onclick="toggleMenu()">☰ Menu</div>
        <ul>
            <li><a href="../index.html">Home</a></li>
            <li><a href="../portfolio.html">Portfolio</a></li>
            <li><a href="../aboutme.html">About Me</a></li>
            <li><a href="../contact.html">Contact</a></li>
        </ul>
    </nav>

    <main class="container blog-post-content">
        <h1>${title}</h1>
        <p class="blog-post-meta">Posted on ${new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}</p>
        ${tags.length ? `<p class="blog-post-tags">Tags: ${tags.join(', ')}</p>` : ''}
        <hr>
        <div class="post-content">${content}</div>
        <hr>
        <p><a href="../index.html">&larr; Back to all posts</a></p>
    </main>

    <script src="../script.js"></script>
</body>
</html>`;

            fs.writeFileSync(
                path.join(blogDir, `${slug}.html`),
                postHtml
            );
            console.log(`Generated blog post: ${slug}.html`);
        }

        console.log('Blog generation complete!');
    } catch (error) {
        console.error('Error generating blog:', error);
    }
}

fetchAndGenerateBlog();