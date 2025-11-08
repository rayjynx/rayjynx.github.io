// menu bar script
function toggleMenu() {
    const navbar = document.querySelector('.navbar');
    navbar.classList.toggle('active');
}


// contact.html
function copyDiscord() {
    const discordText = document.getElementById('discord-username').textContent;
    navigator.clipboard.writeText(discordText).then(() => {
        const message = document.querySelector('.copy-message');
        message.textContent = 'Copied!';
        setTimeout(() => {
            message.textContent = 'Click to copy';
        }, 2000);
    });
}

// portfolio.html
// in portflio.js



// Blog functionality for static site
document.addEventListener('DOMContentLoaded', function() {
    const blogContainer = document.getElementById('blog-posts-container');
    
    if (blogContainer) {
        fetchBlogPosts();
    }
    
    // Replace with this updated version
    async function fetchBlogPosts() {
        try {
            const response = await fetch('/netlify/functions/fetch-blog')
            
            if (!response.ok) {
                // Fallback to static JSON if API fails (optional)
                const staticResponse = await fetch('blog/index.json');
                if (!staticResponse.ok) throw new Error('Both API and static fetch failed');
                const posts = await staticResponse.json();
                displayBlogPosts(posts);
                return;
            }
            
            const posts = await response.json();
            displayBlogPosts(posts);
        } catch (error) {
            console.error('Error:', error);
            const errorMessage = document.createElement('li');
            errorMessage.textContent = 'Error loading blog posts. Please refresh.';
            errorMessage.style.color = '#ff6b6b';
            const blogContainer = document.getElementById('blog-posts-container');
            blogContainer.innerHTML = '';
            blogContainer.appendChild(errorMessage);
        }
    }
    
    function displayBlogPosts(posts) {
        if (!posts || posts.length === 0) {
            const noPostsMessage = document.createElement('li');
            noPostsMessage.textContent = 'No blog posts yet. Check back soon!';
            blogContainer.innerHTML = '';
            blogContainer.appendChild(noPostsMessage);
            return;
        }
        
        blogContainer.innerHTML = '';
        
        posts.forEach(post => {
            const postElement = document.createElement('li');
            
            const formattedDate = post.date ? new Date(post.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : '';
            
            postElement.innerHTML = `
                <a href="/blog/${post.slug}">
                    <h3 class="blog-post-title">${post.title}</h3>
                    <p class="blog-post-meta">Posted on ${formattedDate}</p>
                    ${post.tags.length > 0 ? `<p class="blog-post-tags">Tags: ${post.tags.join(', ')}</p>` : ''}
                </a>
            `;
            
            blogContainer.appendChild(postElement);
        });
    }
});