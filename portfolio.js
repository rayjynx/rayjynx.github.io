document.addEventListener('DOMContentLoaded', function() {

    const portfolioCards = document.querySelectorAll('.portfolio-card');
    const modals = document.querySelectorAll('.portfolio-modal');
    const closeButtons = document.querySelectorAll('.close-modal');

    // -----------------------------
    // Open modal with fade-in
    // -----------------------------
    portfolioCards.forEach(card => {
        card.addEventListener('click', function(e) {
            e.preventDefault();
            const modalId = this.getAttribute('data-modal-target');
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('active'); // triggers fade-in
                document.body.style.overflow = 'hidden'; // prevent background scroll
            }
        });
    });

    // -----------------------------
    // Close modal (X button or overlay)
    // -----------------------------
    function closeModalWithFade(modal) {
        modal.classList.add('closing'); // start fade-out
        document.body.style.overflow = ''; // re-enable scroll
        setTimeout(() => {
            modal.classList.remove('active', 'closing');
        }, 200); // match CSS animation duration (0.3s)
    }

    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.portfolio-modal');
            if (modal) closeModalWithFade(modal);
        });
    });

    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            // Only close if clicking on the overlay, not inside content
            if (e.target === this) {
                closeModalWithFade(this);
            }
        });
    });

    // -----------------------------
    // Thumbnail click handler
    // -----------------------------
    const thumbnails = document.querySelectorAll('.thumbnail');
    thumbnails.forEach(thumb => {
        thumb.addEventListener('click', function() {
            const project = this.closest('.portfolio-project-modal-view');
            if (!project) return;

            // Remove active class from other thumbnails
            project.querySelectorAll('.thumbnail').forEach(t => {
                t.classList.remove('active');
            });

            // Set clicked thumbnail active
            this.classList.add('active');

            // Update main image
            const mainImage = project.querySelector('.main-image img');
            if (mainImage) {
                mainImage.src = this.src;
            }
        });
    });

    // -----------------------------
    // Main image click handler for zoom viewer
    // -----------------------------
    const mainImages = document.querySelectorAll('.main-image img');
    mainImages.forEach(img => {
        img.addEventListener('click', function() {
            const viewer = document.querySelector('.image-viewer');
            const expandedImg = document.getElementById('expanded-image');
            if (viewer && expandedImg) {
                expandedImg.src = this.src;
                viewer.classList.add('active');
            }
        });
    });

    // -----------------------------
    // Close image viewer
    // -----------------------------
    const closeViewer = document.querySelector('.close-viewer');
    if (closeViewer) {
        closeViewer.addEventListener('click', function() {
            document.querySelector('.image-viewer').classList.remove('active');
        });
    }

    // Close viewer when clicking outside image
    const imageViewer = document.querySelector('.image-viewer');
    if (imageViewer) {
        imageViewer.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    }

    // -----------------------------
    // ESC key closes modals or image viewer
    // -----------------------------
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.portfolio-modal.active');
            const activeViewer = document.querySelector('.image-viewer.active');
            if (activeViewer) {
                activeViewer.classList.remove('active');
            } else if (activeModal) {
                closeModalWithFade(activeModal);
            }
        }
    });
});
