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
document.addEventListener('DOMContentLoaded', function() {
    // Open gallery modal when portfolio item is clicked
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    
    portfolioItems.forEach(item => {
        const itemContent = item.querySelector('.item-content');
        const galleryModal = item.querySelector('.gallery-modal');
        const closeModal = galleryModal.querySelector('.close-modal');
        
        itemContent.addEventListener('click', function(e) {
            e.preventDefault();
            document.body.classList.add('modal-open');
            galleryModal.classList.add('active');
        });
        
        closeModal.addEventListener('click', function() {
            document.body.classList.remove('modal-open');
            galleryModal.classList.remove('active');
        });
    });
    
    // Image viewer functionality
    const imageViewer = document.querySelector('.image-viewer');
    const closeViewer = imageViewer.querySelector('.close-viewer');
    const expandedImg = imageViewer.querySelector('#expanded-image');
    
    // Close modal when clicking outside the image
    imageViewer.addEventListener('click', function(e) {
        if (e.target === imageViewer) {
            closeImageViewer();
        }
    });
    
    // Close with escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
    
    function closeAllModals() {
        document.querySelectorAll('.gallery-modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
        closeImageViewer();
        document.body.classList.remove('modal-open');
    }
    
    function closeImageViewer() {
        imageViewer.classList.remove('active');
    }
    
    // Set up click events for gallery images
    document.querySelectorAll('.gallery-grid img').forEach(img => {
        img.addEventListener('click', function() {
            expandedImg.src = this.src;
            expandedImg.alt = this.alt;
            imageViewer.classList.add('active');
        });
    });
    
    closeViewer.addEventListener('click', closeImageViewer);
});