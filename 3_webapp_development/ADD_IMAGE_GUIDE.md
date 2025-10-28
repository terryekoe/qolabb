# How to Add Your Student Collaboration Image

## Quick Steps

1. **Get your image ready**:
   - Image of students smiling and collaborating
   - Recommended size: 1000x1000px or larger (square aspect ratio works best)
   - Format: JPG, PNG, or WebP

2. **Add the image to your project**:
   - Place your image file in: `/Users/terryekoe/Documents/MIT Course Work/ELO2/qolabb/3_webapp_development/public/`
   - Rename it to: `students-collaborating.jpg` (or `.png`/`.webp`)

3. **If using a different filename**:
   - Open `components/home/HeroSection.tsx`
   - Find line with `src="/students-collaborating.jpg"`
   - Change to your filename: `src="/your-image-name.jpg"`

4. **Refresh your browser** to see the new image!

## Terminal Command (if you have the image)

```bash
# Copy your image to the public folder
cp /path/to/your/image.jpg "/Users/terryekoe/Documents/MIT Course Work/ELO2/qolabb/3_webapp_development/public/students-collaborating.jpg"
```

## Current Behavior

- ✅ The code now supports real images using Next.js `Image` component
- ✅ Fallback placeholder shown if image doesn't exist yet
- ✅ Optimized image loading with lazy loading
- ✅ Proper alt text for accessibility

## What You'll See

**Before adding image**: 
- Emoji placeholder with text "Add your image to /public/students-collaborating.jpg"

**After adding image**:
- Your actual student collaboration photo displayed beautifully
- Optimized and responsive
- Smooth animations on the floating cards

## Alternative: Use an External Image URL

If you want to use an image from the web:

1. Open `next.config.ts`
2. Add the image domain to allowed domains
3. Use the full URL in the `src` attribute

Example:
```typescript
// next.config.ts
const nextConfig = {
  images: {
    domains: ['your-image-domain.com'],
  },
};
```

Then in HeroSection:
```tsx
src="https://your-image-domain.com/students.jpg"
```

## Recommended Free Stock Photos

If you need placeholder images, try:
- **Unsplash**: https://unsplash.com/s/photos/students-collaborating
- **Pexels**: https://www.pexels.com/search/students%20teamwork/
- **Pixabay**: https://pixabay.com/images/search/student%20group/

Search terms: "students collaborating", "team project", "student teamwork"

---

**Ready to add your image?** Just drop it in the `/public/` folder and refresh!
