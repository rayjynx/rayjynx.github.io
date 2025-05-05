require('dotenv').config(); // Load .env
const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked'); // Add this package for Markdown conversion

// Initialize Notion client
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

// Function to convert Notion blocks to HTML
async function convertBlocksToHtml(blocks) {
    let html = '';
    
    for (const block of blocks) {
        switch (block.type) {
            case 'paragraph':
                html += `<p>${convertRichText(block.paragraph.rich_text)}</p>`;
                break;
            case 'heading_1':
                html += `<h2>${convertRichText(block.heading_1.rich_text)}</h2>`;
                break;
            case 'heading_2':
                html += `<h3>${convertRichText(block.heading_2.rich_text)}</h3>`;
                break;
            case 'heading_3':
                html += `<h4>${convertRichText(block.heading_3.rich_text)}</h4>`;
                break;
            case 'bulleted_list_item':
                html += `<li>${convertRichText(block.bulleted_list_item.rich_text)}</li>`;
                break;
            case 'numbered_list_item':
                html += `<li>${convertRichText(block.numbered_list_item.rich_text)}</li>`;
                break;
            case 'code':
                html += `<pre><code class="language-${block.code.language}">${block.code.rich_text[0]?.plain_text || ''}</code></pre>`;
                break;
            case 'image':
                const imageUrl = block.image.type === 'external' ? block.image.external.url : block.image.file.url;
                html += `<img src="${imageUrl}" alt="${block.image.caption?.[0]?.plain_text || ''}" class="blog-image">`;
                break;
            case 'quote':
                html += `<blockquote>${convertRichText(block.quote.rich_text)}</blockquote>`;
                break;
            case 'divider':
                html += '<hr>';
                break;
            // Add more block types as needed
        }
    }
    
    return html;
}

function convertRichText(richTextArray) {
    return richTextArray.map(text => {
        let content = text.plain_text;
        if (text.annotations.bold) content = `<strong>${content}</strong>`;
        if (text.annotations.italic) content = `<em>${content}</em>`;
        if (text.annotations.code) content = `<code>${content}</code>`;
        if (text.href) content = `<a href="${text.href}">${content}</a>`;
        return content;
    }).join('');
}

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
            const slug = post.properties.Slug?.rich_text[0]?.plain_text || generateSlug(title);
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
            const slug = post.properties.Slug?.rich_text[0]?.plain_text || generateSlug(title);
            const date = post.properties.Date?.date?.start || '';
            const tags = post.properties.Tags?.multi_select?.map(tag => tag.name) || [];
            
            // Fetch the page content
            const blocks = await notion.blocks.children.list({
                block_id: post.id
            });
            
            // Convert blocks to HTML
            const content = await convertBlocksToHtml(blocks.results);
            
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

function generateSlug(title) {
    return title.toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove non-word characters
        .replace(/\s+/g, '-')     // Replace spaces with hyphens
        .replace(/--+/g, '-');     // Replace multiple hyphens with single
}

fetchAndGenerateBlog(); 