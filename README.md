# Reilly & Jacob Wedding Website

A modern, responsive wedding website with a warm, personal memory-board aesthetic featuring a corkboard background with pinned polaroid-style elements.

## 🎨 Design Features

- **Corkboard Background**: High-resolution texture that scales to fill viewport
- **Pinned Elements**: Polaroid-style photo cards with subtle rotation (±2–4°)
- **Pushpin Details**: Red and brass thumbtacks at the top of cards
- **Save the Date Card**: Primary focal element with elegant typography
- **Responsive Design**: Mobile-first approach with stacked layout on smaller screens
- **Minimal Animations**: Subtle hover effects and entrance animations
- **Accessible**: High contrast, readable text, keyboard navigation support

## 📁 File Structure

```
.
├── index.html          # Main HTML structure
├── styles.css          # All styling and responsive design
├── script.js           # Minimal JavaScript for interactions
└── README.md          # This file
```

## 🚀 Getting Started

### Local Development

1. **Clone or download** this repository
2. **Open `index.html`** in a modern web browser
3. No build process needed - pure HTML/CSS/JS

### Using a Local Server (Recommended)

For the best experience and to avoid CORS issues:

```bash
# Using Python 3
python3 -m http.server 8000

# Using Node.js (with npx)
npx http-server

# Using PHP
php -S localhost:8000
```

Then visit `http://localhost:8000` in your browser.

## 📝 Customization Guide

### Adding Your Own Photos

Replace the placeholder photo divs in `index.html`:

```html
<!-- Replace this: -->
<div class="photo-placeholder photo-1">
    <span class="photo-label">Photo 1</span>
</div>

<!-- With this: -->
<img src="path/to/your-photo.jpg" alt="Description" class="photo-image">
```

Then add this CSS to `styles.css`:

```css
.photo-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
```

### Changing the Corkboard Background

1. Find a high-resolution corkboard texture image (2000px+ width recommended)
2. Update the URL in `styles.css` line 36:

```css
.corkboard-container {
    background: 
        linear-gradient(rgba(201, 167, 106, 0.85), rgba(201, 167, 106, 0.85)),
        url('YOUR_CORKBOARD_IMAGE_URL_HERE') center/cover no-repeat fixed;
}
```

**Recommended free image sources:**
- [Unsplash](https://unsplash.com/s/photos/corkboard)
- [Pexels](https://www.pexels.com/search/corkboard/)
- [Pixabay](https://pixabay.com/images/search/cork-board/)

### Customizing Colors

Edit CSS custom properties at the top of `styles.css`:

```css
:root {
    --corkboard-bg: #c9a76a;      /* Main background color */
    --card-white: #fefef8;         /* Card background */
    --text-dark: #2c2c2c;          /* Main text color */
    --text-light: #666;            /* Secondary text */
    --pushpin-red: #c84545;        /* Red pushpin color */
    --pushpin-brass: #b8860b;      /* Brass pushpin color */
}
```

### Adding More Cards

Copy and paste any card structure in `index.html` and adjust the `data-rotation` value:

```html
<div class="card polaroid" data-rotation="2">
    <div class="pushpin pushpin-red"></div>
    <div class="polaroid-frame">
        <div class="photo-placeholder">
            <span class="photo-label">Your Photo</span>
        </div>
        <div class="polaroid-caption">Your Caption</div>
    </div>
</div>
```

**Valid rotation values**: `-4, -3, -2, -1, 1, 2, 3, 4`

## 🎯 Typography

The site uses three Google Fonts:
- **Dancing Script**: Script font for names and captions
- **Playfair Display**: Elegant serif for headings and dates
- **Lato**: Clean sans-serif for body text

## 📱 Responsive Breakpoints

- **Desktop**: 769px and above - Grid layout with multiple columns
- **Tablet**: 481px to 768px - Reduced grid with adjusted spacing
- **Mobile**: 480px and below - Single column, stacked cards

## ⚡ Performance

- No external dependencies (except Google Fonts)
- Minimal JavaScript
- CSS-only animations
- Lazy loading support built-in for images
- Total file size < 50KB (excluding images)

## ♿ Accessibility Features

- Semantic HTML5 structure
- ARIA-compliant navigation
- Keyboard navigation support
- Focus indicators for interactive elements
- Reduced motion support for users with motion sensitivity
- High contrast text for readability
- Print-friendly styles

## 🌐 Browser Support

Works on all modern browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 📄 License

This project is free to use and modify for personal wedding websites.

## 🎉 Next Steps

1. **Add your photos**: Replace placeholder images with your own
2. **Customize text**: Update names, date, and location
3. **Add detail pages**: Complete the Details, Travel, RSVP, and Registry sections
4. **Test responsiveness**: Check on multiple devices
5. **Deploy**: Host on GitHub Pages, Netlify, or your preferred platform

## 🚢 Deployment Options

### GitHub Pages
1. Push this repo to GitHub
2. Go to Settings → Pages
3. Select your branch and root folder
4. Your site will be live at `username.github.io/repo-name`

### Netlify
1. Drag and drop the folder to [Netlify Drop](https://app.netlify.com/drop)
2. Your site is instantly deployed with a custom URL

### Custom Domain
Point your domain's DNS to your hosting provider:
- For GitHub Pages: Create a CNAME file with your domain
- For Netlify: Add custom domain in site settings

---

**Questions or issues?** Feel free to modify and adapt this template to make it your own!

🎊 Congratulations Reilly & Jacob! 🎊
