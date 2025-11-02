document.addEventListener('DOMContentLoaded', function() {
    
    
    const portfolioCards = document.querySelectorAll('.portfolio-card');
    const modals = document.querySelectorAll('.portfolio-modal');
    const closeButtons = document.querySelectorAll('.close-modal');

    // Open modal when a card is clicked
    portfolioCards.forEach(card => {
        card.addEventListener('click', function(e) {
            e.preventDefault();
            const modalId = this.getAttribute('data-modal-target');
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('active');
            }
        });
    });

    // Close modal with the 'X' button
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.portfolio-modal').classList.remove('active');
        });
    });

    // Close modal by clicking on the background overlay
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            // Check if the click is on the modal background itself, not the content
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });



    // Thumbnail click handler
    const thumbnails = document.querySelectorAll('.thumbnail');
    thumbnails.forEach(thumb => {
        thumb.addEventListener('click', function() {
            // Find the closest project *view* (which is now inside a modal)
            const project = this.closest('.portfolio-project-modal-view'); 
            
            // Remove active class from all thumbnails in this project
            project.querySelectorAll('.thumbnail').forEach(t => {
                t.classList.remove('active');
            });
            
            // Add active class to clicked thumbnail
            this.classList.add('active');
            
            // Get the main image
            const mainImage = project.querySelector('.main-image img');
            const newSrc = this.src;
            
            // Update main image
            mainImage.src = newSrc;
        });
    });
    
    // Main image click handler for zoom
    const mainImages = document.querySelectorAll('.main-image img');
    mainImages.forEach(img => {
        img.addEventListener('click', function() {
            const viewer = document.querySelector('.image-viewer');
            const expandedImg = document.getElementById('expanded-image');
            
            expandedImg.src = this.src;
            viewer.classList.add('active');
        });
    });
    
    // Close image viewer
    const closeViewer = document.querySelector('.close-viewer');
    closeViewer.addEventListener('click', function() {
        document.querySelector('.image-viewer').classList.remove('active');
    });
    
    // Close viewer when clicking outside the image
    document.querySelector('.image-viewer').addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
        }
    });
});