import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * Component that lazy loads images and iframes within article content
 */
const LazyArticleContent = ({ htmlContent }) => {
  const [processedContent, setProcessedContent] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    if (!htmlContent) {
      setProcessedContent('');
      return;
    }

    // Parse HTML and add lazy loading attributes
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Process images for lazy loading
    const images = doc.querySelectorAll('img');
    images.forEach(img => {
      // Store original src in data-src
      const src = img.getAttribute('src');
      if (src) {
        img.setAttribute('data-src', src);
        img.removeAttribute('src');
        img.classList.add('lazy-image');
        
        // Add placeholder if no placeholder class exists
        if (!img.classList.contains('placeholder')) {
          img.style.backgroundColor = '#f5f5f5';
          img.style.minHeight = '100px';
        }
      }
    });

    // Process iframes (YouTube embeds) for lazy loading
    const iframes = doc.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      const src = iframe.getAttribute('src');
      if (src) {
        iframe.setAttribute('data-src', src);
        iframe.removeAttribute('src');
        iframe.classList.add('lazy-iframe');
        
        // Add loading placeholder
        const placeholder = doc.createElement('div');
        placeholder.className = 'iframe-placeholder';
        placeholder.style.cssText = `
          background: linear-gradient(135deg, #f5f5f5 25%, #e0e0e0 25%, #e0e0e0 50%, #f5f5f5 50%, #f5f5f5 75%, #e0e0e0 75%, #e0e0e0);
          background-size: 40px 40px;
          animation: shimmer 2s infinite linear;
          min-height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          font-family: sans-serif;
          border-radius: 8px;
        `;
        placeholder.textContent = 'Loading content...';
        iframe.parentNode.insertBefore(placeholder, iframe);
      }
    });

    // Add CSS for lazy loading animation
    const style = doc.createElement('style');
    style.textContent = `
      @keyframes shimmer {
        0% { background-position: -40px 0; }
        100% { background-position: 40px 0; }
      }
      .lazy-image.loaded {
        animation: fadeIn 0.5s ease-in;
      }
      @keyframes fadeIn {
        from { opacity: 0.3; }
        to { opacity: 1; }
      }
    `;
    doc.head.appendChild(style);

    setProcessedContent(doc.body.innerHTML);
  }, [htmlContent]);

  // Intersection Observer to lazy load images/iframes when they enter viewport
  useEffect(() => {
    if (!containerRef.current || !processedContent) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target;
            
            if (element.classList.contains('lazy-image')) {
              const src = element.getAttribute('data-src');
              if (src) {
                element.setAttribute('src', src);
                element.classList.add('loaded');
                observer.unobserve(element);
              }
            }
            
            if (element.classList.contains('lazy-iframe')) {
              const src = element.getAttribute('data-src');
              if (src) {
                element.setAttribute('src', src);
                // Remove placeholder if it exists
                const placeholder = element.previousElementSibling;
                if (placeholder && placeholder.classList.contains('iframe-placeholder')) {
                  placeholder.remove();
                }
                observer.unobserve(element);
              }
            }
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before element enters viewport
        threshold: 0.1
      }
    );

    // Observe all lazy elements
    const lazyImages = containerRef.current.querySelectorAll('.lazy-image, .lazy-iframe');
    lazyImages.forEach(img => observer.observe(img));

    return () => {
      observer.disconnect();
    };
  }, [processedContent]);

  return (
    <div 
      ref={containerRef}
      className="lazy-article-content"
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
};

/**
 * Higher-order component that splits article content into sections for progressive loading
 */
export const ProgressiveArticleContent = ({ htmlContent, sectionSize = 5 }) => {
  const [visibleSections, setVisibleSections] = useState(1);
  const sectionsRef = useRef([]);

  useEffect(() => {
    if (!htmlContent) return;

    // Split content into paragraphs or sections
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const paragraphs = Array.from(doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote'));
    
    // Group into sections
    const sections = [];
    for (let i = 0; i < paragraphs.length; i += sectionSize) {
      const sectionParagraphs = paragraphs.slice(i, i + sectionSize);
      const sectionDiv = doc.createElement('div');
      sectionDiv.className = 'article-section';
      sectionParagraphs.forEach(p => sectionDiv.appendChild(p.cloneNode(true)));
      sections.push(sectionDiv.outerHTML);
    }

    sectionsRef.current = sections;
    setVisibleSections(1); // Start with first section
  }, [htmlContent, sectionSize]);

  // Set up intersection observer for loading more sections
  useEffect(() => {
    if (visibleSections >= sectionsRef.current.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleSections(prev => Math.min(prev + 1, sectionsRef.current.length));
        }
      },
      { threshold: 0.5 }
    );

    // Observe the last visible section
    const lastSection = document.querySelector('.article-section:last-child');
    if (lastSection) {
      observer.observe(lastSection);
    }

    return () => observer.disconnect();
  }, [visibleSections]);

  if (!htmlContent) return null;

  return (
    <div className="progressive-article">
      {sectionsRef.current.slice(0, visibleSections).map((section, index) => (
        <div 
          key={index}
          className="article-section animate-in fade-in slide-in-from-bottom-2 duration-300"
          dangerouslySetInnerHTML={{ __html: section }}
        />
      ))}
      
      {visibleSections < sectionsRef.current.length && (
        <div className="flex justify-center py-8">
          <div className="animate-pulse text-slate-400">
            Loading more content...
          </div>
        </div>
      )}
    </div>
  );
};

LazyArticleContent.propTypes = {
  htmlContent: PropTypes.string
};

ProgressiveArticleContent.propTypes = {
  htmlContent: PropTypes.string,
  sectionSize: PropTypes.number
};

export default LazyArticleContent;