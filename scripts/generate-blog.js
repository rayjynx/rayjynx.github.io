// scripts/generate-blog.js
const { Client } = require('@notionhq/client');
const { NotionToMarkdown } = require('notion-to-md');
const fs = require('fs');
const path = require('path');

// --- Configuration ---
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;
const OUTPUT_DIR = path.join(__dirname, '..', 'blog'); // Output to a 'blog' folder in the site root
const POSTS_DIR = path.join(OUTPUT_DIR, 'posts');
const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html'); // Path to your main index.html
const INDEX_SNIPPET_MARKER = '<!-- BLOG_INDEX_SNIPPET -->'; // Marker in index.html

// --- Initialize Notion Client ---
const notion = new Client({ auth: NOTION_API_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

// --- Dependencies for Markdown to HTML (ensure you have them installed) ---
// npm install @notionhq/client notion-to-md markdown-it
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt({
    html: true, // Allow HTML tags in your markdown
    linkify: true,
    typographer: true
});

// --- Helper: Sanitize slug for URLs ---
function sanitizeSlug(title) {
    return title.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove invalid characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-'); // Remove multiple hyphens
}

// --- Helper: Convert Notion Rich Text to Plain Text ---
function richTextToPlainText(richTextArray) {
    if (!richTextArray || richTextArray.length === 0) return '';
    return richTextArray.map(item => item.plain_text).join('');
}

// --- Helper: Convert Notion Date object to formatted string ---
function formatDate(dateObj) {
    if (!dateObj || !dateObj.start) return 'No Date';
    const date = new Date(dateObj.start);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// --- Main function to fetch and generate ---
async function generateBlog() {
    if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
        console.error('Error: NOTION_API_KEY or NOTION_DATABASE_ID not set.');
        process.exit(1);
    }

    try {
        console.log('Fetching posts from Notion...');
        const databaseId = NOTION_DATABASE_ID;

        // Query the database for published posts
        const response = await notion.databases.query({
            database_id: databaseId,
            filter: {
                property: 'Published',
                checkbox: {
                    equals: true,
                },
            },
            sorts: [
                {
                    property: 'Date',
                    direction: 'descending',
                },
            ],
        });

        const posts = response.results;
        console.log(`Found ${posts.length} published posts.`);

        // Ensure output directories exist
        if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);
        if (!fs.existsSync(POSTS_DIR)) fs.mkdirSync(POSTS_DIR);

        // Clean up old post files (optional but recommended)
        console.log('Cleaning up old post files...');
         fs.readdirSync(POSTS_DIR).forEach(file => {
            if (file.endsWith('.html')) {
                fs.unlinkSync(path.join(POSTS_DIR, file));
            }
        });


        let blogIndexSnippetHtml = '<div class="blog-index-section">\n<h2>Latest Blog Posts</h2>\n<ul class="blog-post-list">';

        // Process each post
        for (const post of posts) {
            const properties = post.properties;
            const title = richTextToPlainText(properties.Title.title);
            let slug = richTextToPlainText(properties.Slug?.rich_text || ''); // Use optional chaining and default empty string
            const date = formatDate(properties.Date?.date); // Use optional chaining
            const tags = properties.Tags?.multi_select?.map(tag => tag.name) || []; // Use optional chaining and default empty array

             // Skip if essential properties are missing
            if (!title || !slug) {
                console.warn(`Skipping post with missing Title or Slug: ${post.id}`);
                continue;
            }


            // If slug is empty in Notion, generate from title
            if (!slug) {
                slug = sanitizeSlug(title);
                console.warn(`Slug for post "${title}" was empty, generated: "${slug}"`);
            } else {
                 // Ensure provided slug is also sanitized
                 slug = sanitizeSlug(slug);
            }

            const postFileName = `${slug}.html`;
            const postFilePath = path.join(POSTS_DIR, postFileName);

            console.log(`Processing post: "${title}" (Slug: ${slug})`);

            // Fetch content blocks
            const mdblocks = await n2m.pageToMarkdown(post.id);
            const markdown = n2m.toMarkdownString(mdblocks).parent;

            // Convert Markdown to HTML
            const postContentHtml = md.render(markdown);

            // Create HTML content for the post page using your site's structure
            const postHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Recursive:wght@300..1000&display=swap" rel="stylesheet">

    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="stylesheet" href="/style.css"> <!-- Link to your main stylesheet -->
</head>
<body>
    <nav class="navbar">
        <div class="hamburger" onclick="toggleMenu()">☰ Menu</div>
        <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/portfolio.html">Portfolio</a></li>
            <li><a href="/aboutme.html">About Me</a></li>
            <li><a href="/contact.html">Contact</a></li>
            <!-- Add a blog link if you want it in the main nav -->
            <!-- <li><a href="/blog/">Blog Index (Generated)</a></li> -->
        </ul>
    </nav>

    <main class="container blog-post-content">
        <h1>${title}</h1>
        <p><em>Published: ${date}</em></p>
        ${tags.length > 0 ? `<p>Tags: ${tags.join(', ')}</p>` : ''}

        ${postContentHtml}
    </main>

    <!-- Your site doesn't explicitly have a footer in the example, add one if needed -->
    <!--
    <footer>
        <p>© ${new Date().getFullYear()} Ray </p>
    </footer>
    -->

    <script src="script.js"></script> <!-- Include your main script for menu etc. -->
</body>
</html>
`;

            // Write the post HTML file
            fs.writeFileSync(postFilePath, postHtml, 'utf8');
            console.log(`Generated ${postFilePath}`);

            // Add entry to blog index HTML snippet
            blogIndexSnippetHtml += `
            <li>
                <h3 class="blog-post-title"><a href="/blog/posts/${postFileName}">${title}</a></h3>
                <p class="blog-post-meta"><em>Published: ${date}</em></p>
                ${tags.length > 0 ? `<p class="blog-post-tags">Tags: ${tags.join(', ')}</p>` : ''}
            </li>`;
        }

        blogIndexSnippetHtml += '</ul>\n</div>';

        // --- Inject the blog index snippet into index.html ---
        console.log(`Reading index.html from ${INDEX_HTML_PATH}`);
        let indexHtmlContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

        if (indexHtmlContent.includes(INDEX_SNIPPET_MARKER)) {
            console.log(`Found marker "${INDEX_SNIPPET_MARKER}", injecting snippet...`);
            indexHtmlContent = indexHtmlContent.replace(INDEX_SNIPPET_MARKER, blogIndexSnippetHtml);

            console.log(`Writing updated index.html to ${INDEX_HTML_PATH}`);
            fs.writeFileSync(INDEX_HTML_PATH, indexHtmlContent, 'utf8');
            console.log('index.html updated successfully.');
        } else {
            console.warn(`Marker "${INDEX_SNIPPET_MARKER}" not found in index.html. Blog index will not be injected.`);
            console.log('Generated blog index snippet (not injected):');
            console.log(blogIndexSnippetHtml); // Print snippet for debugging
        }

        console.log('Blog generation complete.');

    } catch (error) {
        console.error('Error generating blog:', error);
        process.exit(1); // Exit with a non-zero code to indicate failure
    }
}

generateBlog();