// Minimal JavaScript for enhanced interactions

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing lightbox...');
    
    // Lightbox functionality
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.querySelector('.lightbox-close');
    const prevBtn = document.querySelector('.lightbox-prev');
    const nextBtn = document.querySelector('.lightbox-next');
    
    console.log('Lightbox element:', lightbox);
    console.log('Lightbox image:', lightboxImg);
    
    // Get all clickable images
    const allImages = [];
    const imageElements = [];
    
    // Add save-the-date first
    const saveTheDateImg = document.querySelector('.save-the-date-image');
    if (saveTheDateImg) {
        allImages.push(saveTheDateImg.src);
        imageElements.push(saveTheDateImg);
        console.log('Found save-the-date image');
    }
    
    // Add all polaroid images
    const polaroidImages = document.querySelectorAll('.polaroid-photo');
    console.log('Found polaroid images:', polaroidImages.length);
    polaroidImages.forEach(img => {
        allImages.push(img.src);
        imageElements.push(img);
    });
    
    console.log('Total images:', allImages.length);
    
    let currentIndex = 0;
    
    // Function to open lightbox
    function openLightbox(index) {
        console.log('Opening lightbox, index:', index);
        currentIndex = index;
        lightboxImg.src = allImages[currentIndex];
        
        // Force inline styles to override everything
        lightbox.style.display = 'flex';
        lightbox.style.position = 'fixed';
        lightbox.style.top = '0';
        lightbox.style.left = '0';
        lightbox.style.width = '100vw';
        lightbox.style.height = '100vh';
        lightbox.style.zIndex = '999999';
        lightbox.style.background = 'rgba(0, 0, 0, 0.95)';
        lightbox.style.alignItems = 'center';
        lightbox.style.justifyContent = 'center';
        
        // Fix button positioning
        if (closeBtn) {
            closeBtn.style.position = 'fixed';
            closeBtn.style.top = '30px';
            closeBtn.style.right = '30px';
            closeBtn.style.left = 'auto';
            closeBtn.style.zIndex = '1000000';
            closeBtn.style.fontSize = '3.5rem';
            closeBtn.style.padding = '10px 30px';
        }
        if (prevBtn) {
            prevBtn.style.position = 'fixed';
            prevBtn.style.left = '30px';
            prevBtn.style.top = '50%';
            prevBtn.style.right = 'auto';
            prevBtn.style.transform = 'translateY(-50%)';
            prevBtn.style.zIndex = '1000000';
            prevBtn.style.fontSize = '4rem';
            prevBtn.style.padding = '20px 30px';
        }
        if (nextBtn) {
            nextBtn.style.position = 'fixed';
            nextBtn.style.right = '30px';
            nextBtn.style.top = '50%';
            nextBtn.style.left = 'auto';
            nextBtn.style.transform = 'translateY(-50%)';
            nextBtn.style.zIndex = '1000000';
            nextBtn.style.fontSize = '4rem';
            nextBtn.style.padding = '20px 30px';
        }
        
        // Fix image sizing
        lightboxImg.style.maxWidth = '90vw';
        lightboxImg.style.maxHeight = '90vh';
        lightboxImg.style.width = 'auto';
        lightboxImg.style.height = 'auto';
        lightboxImg.style.objectFit = 'contain';
        
        document.body.style.overflow = 'hidden';
        console.log('Lightbox opened');
    }
    
    // Function to close lightbox
    function closeLightbox() {
        console.log('Closing lightbox');
        lightbox.style.display = 'none';
        document.body.style.overflow = '';
    }
    
    // Function to show next image
    function showNext() {
        currentIndex = (currentIndex + 1) % allImages.length;
        lightboxImg.src = allImages[currentIndex];
    }
    
    // Function to show previous image
    function showPrev() {
        currentIndex = (currentIndex - 1 + allImages.length) % allImages.length;
        lightboxImg.src = allImages[currentIndex];
    }
    
    // Add click events to all images (mobile only)
    function isMobile() {
        return window.innerWidth <= 768;
    }
    
    // Desktop image overlay
    const imageOverlay = document.getElementById('image-overlay');
    const overlayImg = document.getElementById('overlay-img');
    const overlayClose = document.querySelector('.image-overlay-close');
    
    console.log('Desktop overlay element:', imageOverlay);
    console.log('Overlay img element:', overlayImg);
    console.log('Is mobile:', isMobile());
    
    imageElements.forEach((img, index) => {
        img.style.cursor = 'pointer';
        img.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Image clicked, index:', index);
            openLightbox(index);
        });
    });
    
    // Close desktop overlay
    if (overlayClose) {
        overlayClose.addEventListener('click', function(e) {
            e.stopPropagation();
            imageOverlay.style.display = 'none';
            imageOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    // Close on background click
    if (imageOverlay) {
        imageOverlay.addEventListener('click', function(e) {
            if (e.target === imageOverlay) {
                imageOverlay.style.display = 'none';
                imageOverlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
    
    // Close button
    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            closeLightbox();
        });
    }
    
    // Navigation buttons
    if (prevBtn) {
        prevBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            showPrev();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            showNext();
        });
    }
    
    // Close on background click
    if (lightbox) {
        lightbox.addEventListener('click', function(e) {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        const isOpen = lightbox.style.display === 'flex';
        if (!isOpen) return;
        
        if (e.key === 'Escape') {
            closeLightbox();
        } else if (e.key === 'ArrowRight') {
            showNext();
        } else if (e.key === 'ArrowLeft') {
            showPrev();
        }
    });
    
    console.log('Lightbox initialized successfully');
    
    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('.nav-tab');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // If it's a hash link, handle smooth scrolling
            if (href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
    
    // Parallax effect disabled for cleaner hover interactions
    /*
    const cards = document.querySelectorAll('.card');
    let ticking = false;
    
    function updateParallax() {
        const scrolled = window.pageYOffset;
        
        cards.forEach((card, index) => {
            const speed = 0.05 + (index * 0.01);
            const yPos = -(scrolled * speed);
            card.style.transform = `translateY(${yPos}px) rotate(${card.dataset.rotation}deg)`;
        });
        
        ticking = false;
    }
    
    window.addEventListener('scroll', function() {
        if (!ticking) {
            window.requestAnimationFrame(updateParallax);
            ticking = true;
        }
    });
    */
    
    // Lazy loading for images (when you add real photos)
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.classList.add('loaded');
                        observer.unobserve(img);
                    }
                }
            });
        });
        
        const images = document.querySelectorAll('img[data-src]');
        images.forEach(img => imageObserver.observe(img));
    }
    
    // Add entrance animation on page load
    const mainCards = document.querySelectorAll('.card');
    mainCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = `translateY(20px) rotate(${card.dataset.rotation}deg)`;
        
        setTimeout(() => {
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = `translateY(0) rotate(${card.dataset.rotation}deg)`;
        }, 100 * index);
    });
});

// Handle back navigation from detail sections
window.addEventListener('hashchange', function() {
    if (window.location.hash === '') {
        // Scroll back to top when returning to main page
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});
