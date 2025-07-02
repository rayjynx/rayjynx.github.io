document.addEventListener('DOMContentLoaded', function() {
    // Thumbnail click handler
    const thumbnails = document.querySelectorAll('.thumbnail');
    thumbnails.forEach(thumb => {
        thumb.addEventListener('click', function() {
            const project = this.closest('.portfolio-project');
            
            // Remove active class from all thumbnails in this project
            project.querySelectorAll('.thumbnail').forEach(t => {
                t.classList.remove('active');
            });
            
            // Add active class to clicked thumbnail
            this.classList.add('active');
            
            // Get the main image src from data attribute or src
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