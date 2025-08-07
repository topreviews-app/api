// src/widget/widget.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewsService } from '../reviews/reviews.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { CreateReviewDto } from '../reviews/dto/create-review.dto';

@Injectable()
export class WidgetService {
	constructor(
		private prisma: PrismaService,
		private reviewsService: ReviewsService,
		private analyticsService: AnalyticsService,
	) { }

	// ========================================
	// MAIN API METHODS WITH ANALYTICS
	// ========================================

	async getWidgetSettings(siteId: string) {
		const site = await this.prisma.site.findUnique({
			where: { id: siteId },
			select: {
				id: true,
				name: true,
				domain: true,
				settings: true,
				user: {
					select: { plan: true }
				}
			},
		});

		if (!site) {
			throw new NotFoundException('Site not found');
		}

		const defaultSettings = {
			theme: 'light',
			primaryColor: '#007bff',
			backgroundColor: '#ffffff',
			textColor: '#333333',
			borderRadius: '8px',
			showAvatar: true,
			showDate: true,
			layout: 'cards',
			maxReviews: 10,
			showRating: true,
			showSubmitForm: true,
		};

		const settings = { ...defaultSettings, ...(site.settings as any) };
		return { site, settings };
	}

	async getWidgetReviews(siteId: string) {
		return await this.reviewsService.getPublicReviews(siteId);
	}

	async submitWidgetReview(
		siteId: string,
		createReviewDto: CreateReviewDto,
		ipAddress: string,
		userAgent: string,
		referrer?: string
	) {
		return await this.reviewsService.createPublicReview(
			siteId,
			createReviewDto,
			ipAddress,
			userAgent,
		);
	}

	async generateWidgetHtml(
		siteId: string,
		ipAddress?: string,
		userAgent?: string,
		referrer?: string
	) {
		try {
			const { site, settings } = await this.getWidgetSettings(siteId);
			const { reviews } = await this.getWidgetReviews(siteId);

			// Track widget view for analytics
			if (ipAddress) {
				await this.analyticsService.trackWidgetView(
					siteId,
					ipAddress,
					userAgent,
					referrer
				);
			}

			return this.buildFullWidgetPage(site, reviews || [], settings);
		} catch (error) {
			console.error('❌ Widget Service Error:', error);
			throw error;
		}
	}

	async generateEmbedCode(siteId: string, width = 400, height = 500) {
		const site = await this.prisma.site.findUnique({
			where: { id: siteId },
			select: { id: true, name: true },
		});

		if (!site) {
			throw new NotFoundException('Site not found');
		}

		const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';

		return {
			iframe: `<iframe src="${baseUrl}/widget/${siteId}" width="${width}" height="${height}" frameborder="0" scrolling="auto" title="${this.escapeHtml(site.name)} Reviews"></iframe>`,
			javascript: `
<div id="reviews-widget-${siteId}"></div>
<script>
(function() {
  var iframe = document.createElement('iframe');
  iframe.src = '${baseUrl}/widget/${siteId}';
  iframe.width = '${width}';
  iframe.height = '${height}';
  iframe.frameBorder = '0';
  iframe.scrolling = 'auto';
  iframe.title = '${this.escapeHtml(site.name)} Reviews';
  iframe.style.border = 'none';
  iframe.style.overflow = 'hidden';
  
  var container = document.getElementById('reviews-widget-${siteId}');
  if (container) {
    container.appendChild(iframe);
  } else {
    console.error('Reviews widget container not found: reviews-widget-${siteId}');
  }
})();
</script>`,
			instructions: {
				html: 'Copy and paste this HTML code where you want the reviews widget to appear on your website.',
				javascript: 'Use this JavaScript version if you need more control over when the widget loads.',
				customization: 'You can adjust the width and height values to fit your design.',
				responsive: 'For responsive design, set width="100%" and use CSS to control the container.',
			},
		};
	}

	// Public statistics (limited info for public access)
	async getPublicStats(siteId: string) {
		const { reviews } = await this.getWidgetReviews(siteId);

		if (!reviews || reviews.length === 0) {
			return {
				totalReviews: 0,
				averageRating: 0,
				lastUpdated: new Date().toISOString()
			};
		}

		const totalReviews = reviews.length;
		const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;

		return {
			totalReviews,
			averageRating: Math.round(averageRating * 10) / 10,
			lastUpdated: new Date().toISOString()
		};
	}

	// ========================================
	// WIDGET PAGE BUILDING
	// ========================================

	private buildFullWidgetPage(site: any, reviews: any[], settings: any): string {
		const css = this.buildAllStyles(settings);
		const html = this.buildWidgetHTML(site, reviews, settings);
		const js = this.buildWidgetJavaScript(site.id);

		return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(site.name)} Reviews</title>
    <meta name="description" content="Customer reviews for ${this.escapeHtml(site.name)}">
    <style>${css}</style>
</head>
<body>
    <div class="reviews-widget" data-site-id="${site.id}">
        ${html}
    </div>
    <script>${js}</script>
</body>
</html>`;
	}

	// ========================================
	// HTML BLOCKS GENERATION
	// ========================================

	private buildWidgetHTML(site: any, reviews: any[], settings: any): string {
		const header = this.buildHeaderSection(site);
		const reviewsSection = this.buildReviewsSection(reviews, settings);
		const formSection = settings.showSubmitForm ? this.buildSubmitFormSection() : '';

		return `${header}${reviewsSection}${formSection}`;
	}

	private buildHeaderSection(site: any): string {
		return `
      <div class="widget-header">
        <h2 class="widget-title">${this.escapeHtml(site.name)}</h2>
        <p class="widget-subtitle">Customer Reviews</p>
      </div>
    `;
	}

	private buildReviewsSection(reviews: any[], settings: any): string {
		const reviewsHtml = reviews.length > 0
			? this.buildReviewsList(reviews, settings)
			: '<div class="no-reviews">No reviews yet. Be the first to leave a review!</div>';

		return `
      <div class="reviews-container">
        ${reviewsHtml}
      </div>
    `;
	}

	private buildReviewsList(reviews: any[], settings: any): string {
		return reviews.slice(0, settings.maxReviews).map(review => `
      <div class="review-item" data-review-id="${review.id}">
        <div class="review-header">
          <div class="review-author-section">
            <div class="review-author">${this.escapeHtml(review.authorName)}</div>
            ${settings.showDate ? `<div class="review-date">${new Date(review.createdAt).toLocaleDateString()}</div>` : ''}
          </div>
          ${settings.showRating ? `<div class="review-rating" aria-label="Rating: ${review.rating} out of 5 stars">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>` : ''}
        </div>
        <div class="review-comment">${this.escapeHtml(review.comment)}</div>
      </div>
    `).join('');
	}

	private buildSubmitFormSection(): string {
		return `
      <div class="submit-form">
        <h3 class="form-title">Leave a Review</h3>
        <div id="message-container" role="alert" aria-live="polite"></div>
        <form id="review-form" novalidate>
          ${this.buildFormFields()}
          <button type="submit" class="submit-btn" id="submit-btn">
            <span class="btn-text">Submit Review</span>
            <span class="btn-loading" style="display: none;">Submitting...</span>
          </button>
        </form>
      </div>
    `;
	}

	private buildFormFields(): string {
		return `
      <div class="form-group">
        <label class="form-label" for="authorName">Your Name *</label>
        <input type="text" id="authorName" name="authorName" class="form-input" required maxlength="50" autocomplete="name">
      </div>
      
      <div class="form-group">
        <label class="form-label" for="authorEmail">Email (optional)</label>
        <input type="email" id="authorEmail" name="authorEmail" class="form-input" maxlength="100" autocomplete="email">
      </div>
      
      <div class="form-group">
        <label class="form-label">Rating *</label>
        <div class="rating-input" id="rating-stars" role="radiogroup" aria-label="Select rating">
          <span class="star" data-rating="1" role="radio" tabindex="0" aria-label="1 star">★</span>
          <span class="star" data-rating="2" role="radio" tabindex="0" aria-label="2 stars">★</span>
          <span class="star" data-rating="3" role="radio" tabindex="0" aria-label="3 stars">★</span>
          <span class="star" data-rating="4" role="radio" tabindex="0" aria-label="4 stars">★</span>
          <span class="star" data-rating="5" role="radio" tabindex="0" aria-label="5 stars">★</span>
        </div>
        <input type="hidden" id="rating" name="rating" required>
      </div>
      
      <div class="form-group">
        <label class="form-label" for="comment">Your Review *</label>
        <textarea id="comment" name="comment" class="form-textarea" required minlength="10" maxlength="1000" placeholder="Tell us about your experience..." rows="4"></textarea>
        <div class="char-counter">
          <span id="char-count">0</span>/1000 characters
        </div>
      </div>
    `;
	}

	// ========================================
	// CSS STYLES GENERATION
	// ========================================

	private buildAllStyles(settings: any): string {
		return `
      ${this.getBaseStyles()}
      ${this.getLayoutStyles(settings)}
      ${this.getHeaderStyles(settings)}
      ${this.getReviewsStyles(settings)}
      ${this.getFormStyles(settings)}
      ${this.getInteractionStyles()}
      ${this.getResponsiveStyles()}
    `;
	}

	private getBaseStyles(): string {
		return `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        line-height: 1.6;
        padding: 20px;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      
      .reviews-widget {
        max-width: 100%;
        margin: 0 auto;
      }

      /* Accessibility */
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
    `;
	}

	private getLayoutStyles(settings: any): string {
		return `
      body {
        background: ${settings.backgroundColor};
        color: ${settings.textColor};
      }
    `;
	}

	private getHeaderStyles(settings: any): string {
		return `
      .widget-header {
        text-align: center;
        margin-bottom: 30px;
      }
      
      .widget-title {
        font-size: 24px;
        font-weight: bold;
        color: ${settings.textColor};
        margin-bottom: 10px;
      }
      
      .widget-subtitle {
        font-size: 14px;
        color: ${settings.textColor}99;
      }
    `;
	}

	private getReviewsStyles(settings: any): string {
		const isDark = settings.theme === 'dark';
		const isCards = settings.layout === 'cards';

		return `
      .reviews-container {
        margin-bottom: 30px;
      }
      
      .review-item {
        background: ${isDark ? '#2d3748' : '#f7fafc'};
        border: 1px solid ${isDark ? '#4a5568' : '#e2e8f0'};
        border-radius: ${settings.borderRadius};
        padding: 20px;
        margin-bottom: ${isCards ? '15px' : '10px'};
        ${isCards ? 'box-shadow: 0 2px 4px rgba(0,0,0,0.1);' : ''}
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .review-item:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
      }
      
      .review-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 10px;
      }
      
      .review-author-section {
        flex: 1;
      }
      
      .review-author {
        font-weight: bold;
        color: ${settings.textColor};
        margin-bottom: 2px;
      }
      
      .review-date {
        font-size: 12px;
        color: ${settings.textColor}80;
      }
      
      .review-rating {
        color: #ffd700;
        font-size: 16px;
        white-space: nowrap;
      }
      
      .review-comment {
        margin-top: 10px;
        line-height: 1.5;
        word-break: break-word;
      }
      
      .no-reviews {
        text-align: center;
        color: ${settings.textColor}80;
        font-style: italic;
        padding: 40px 20px;
        background: ${isDark ? '#2d3748' : '#f8f9fa'};
        border-radius: ${settings.borderRadius};
        border: 2px dashed ${isDark ? '#4a5568' : '#e2e8f0'};
      }
    `;
	}

	private getFormStyles(settings: any): string {
		const isDark = settings.theme === 'dark';

		return `
      .submit-form {
        background: ${isDark ? '#2d3748' : '#ffffff'};
        border: 1px solid ${isDark ? '#4a5568' : '#e2e8f0'};
        border-radius: ${settings.borderRadius};
        padding: 25px;
        margin-top: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }
      
      .form-title {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 20px;
        color: ${settings.textColor};
      }
      
      .form-group {
        margin-bottom: 15px;
      }
      
      .form-label {
        display: block;
        margin-bottom: 5px;
        font-weight: 500;
        color: ${settings.textColor};
        font-size: 14px;
      }
      
      .form-input,
      .form-textarea {
        width: 100%;
        padding: 12px;
        border: 1px solid ${isDark ? '#4a5568' : '#d1d5db'};
        border-radius: 6px;
        background: ${isDark ? '#374151' : '#ffffff'};
        color: ${settings.textColor};
        font-size: 14px;
        font-family: inherit;
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      
      .form-input:focus,
      .form-textarea:focus {
        outline: none;
        border-color: ${settings.primaryColor};
        box-shadow: 0 0 0 3px ${settings.primaryColor}20;
      }

      .form-input:invalid,
      .form-textarea:invalid {
        border-color: #e53e3e;
      }
      
      .form-textarea {
        resize: vertical;
        min-height: 80px;
      }

      .char-counter {
        text-align: right;
        font-size: 12px;
        color: ${settings.textColor}80;
        margin-top: 4px;
      }
      
      .rating-input {
        display: flex;
        gap: 5px;
        margin-top: 5px;
      }
      
      .star {
        font-size: 24px;
        color: #d1d5db;
        cursor: pointer;
        transition: color 0.2s, transform 0.1s;
        user-select: none;
      }

      .star:focus {
        outline: 2px solid ${settings.primaryColor};
        outline-offset: 2px;
      }
      
      .star:hover,
      .star.active {
        color: #ffd700;
        transform: scale(1.1);
      }
      
      .submit-btn {
        background: ${settings.primaryColor};
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s;
        width: 100%;
        min-height: 44px;
        position: relative;
      }
      
      .submit-btn:hover:not(:disabled) {
        background: ${settings.primaryColor}dd;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
      }
      
      .submit-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      .btn-loading {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
      }
    `;
	}

	private getInteractionStyles(): string {
		return `
      .success-message,
      .error-message {
        padding: 12px 16px;
        border-radius: 6px;
        margin-bottom: 15px;
        font-size: 14px;
        font-weight: 500;
        border: 1px solid transparent;
      }
      
      .success-message {
        background: #d1fae5;
        color: #065f46;
        border-color: #a7f3d0;
      }
      
      .error-message {
        background: #fee2e2;
        color: #991b1b;
        border-color: #fca5a5;
      }

      .fade-in {
        animation: fadeIn 0.3s ease-in;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
	}

	private getResponsiveStyles(): string {
		return `
      @media (max-width: 768px) {
        body {
          padding: 15px;
        }
        
        .widget-title {
          font-size: 20px;
        }
        
        .review-item {
          padding: 15px;
        }
        
        .submit-form {
          padding: 20px;
        }
        
        .review-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }
        
        .star {
          font-size: 20px;
        }
      }
      
      @media (max-width: 480px) {
        body {
          padding: 10px;
        }
        
        .review-item,
        .submit-form {
          padding: 12px;
        }

        .star {
          font-size: 18px;
        }
      }
    `;
	}

	// ========================================
	// JAVASCRIPT GENERATION
	// ========================================

	private buildWidgetJavaScript(siteId: string): string {
		const apiBase = process.env.API_BASE_URL || 'http://localhost:3001';

		return `
      (function() {
        'use strict';
        
        const API_BASE = '${apiBase}';
        const SITE_ID = '${siteId}';
        let selectedRating = 0;
        
        console.log('🎮 Widget loaded for site:', SITE_ID);
        
        // Initialize all functionality
        document.addEventListener('DOMContentLoaded', function() {
          initRatingStars();
          initSubmitForm();
          initCharCounter();
        });
        
        function initRatingStars() {
          const stars = document.querySelectorAll('.star');
          const ratingInput = document.getElementById('rating');
          
          if (!stars.length || !ratingInput) return;
          
          stars.forEach((star, index) => {
            star.addEventListener('click', function() {
              selectedRating = parseInt(this.dataset.rating);
              ratingInput.value = selectedRating;
              updateStars();
            });
            
            star.addEventListener('mouseenter', function() {
              const rating = parseInt(this.dataset.rating);
              highlightStars(rating);
            });

            star.addEventListener('keydown', function(e) {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
              }
            });
            
            star.addEventListener('mouseleave', function() {
              updateStars();
            });
          });
        }
        
        function updateStars() {
          const stars = document.querySelectorAll('.star');
          stars.forEach((star, index) => {
            star.classList.toggle('active', index < selectedRating);
          });
        }
        
        function highlightStars(rating) {
          const stars = document.querySelectorAll('.star');
          stars.forEach((star, index) => {
            star.classList.toggle('active', index < rating);
          });
        }

        function initCharCounter() {
          const textarea = document.getElementById('comment');
          const charCount = document.getElementById('char-count');
          
          if (!textarea || !charCount) return;
          
          textarea.addEventListener('input', function() {
            const length = this.value.length;
            charCount.textContent = length;
            
            if (length > 900) {
              charCount.style.color = '#e53e3e';
            } else {
              charCount.style.color = 'inherit';
            }
          });
        }
        
        function initSubmitForm() {
          const form = document.getElementById('review-form');
          const submitBtn = document.getElementById('submit-btn');
          const btnText = submitBtn.querySelector('.btn-text');
          const btnLoading = submitBtn.querySelector('.btn-loading');
          
          if (!form) return;
          
          form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (submitBtn.disabled) return;
            
            const formData = new FormData(form);
            const reviewData = {
              authorName: formData.get('authorName'),
              authorEmail: formData.get('authorEmail') || undefined,
              rating: parseInt(formData.get('rating')),
              comment: formData.get('comment')
            };
            
            // Validation
            if (!reviewData.authorName || reviewData.authorName.trim().length < 2) {
              showMessage('Please enter your name', 'error');
              return;
            }
            
            if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) {
              showMessage('Please select a rating', 'error');
              return;
            }
            
            if (!reviewData.comment || reviewData.comment.trim().length < 10) {
              showMessage('Please write at least 10 characters in your review', 'error');
              return;
            }
            
            // Submit review
            submitBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline';
            
            try {
              const response = await fetch(API_BASE + '/widget/' + SITE_ID + '/reviews', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(reviewData)
              });
              
              const result = await response.json();
              
              if (result.success) {
                showMessage('Thank you! Your review has been submitted and is pending approval.', 'success');
                form.reset();
                selectedRating = 0;
                updateStars();
                
                // Optionally reload reviews section
                setTimeout(() => {
                  window.location.reload();
                }, 2000);
              } else {
                showMessage(result.message || 'Failed to submit review. Please try again.', 'error');
              }
            } catch (error) {
              console.error('Submit error:', error);
              showMessage('Network error. Please check your connection and try again.', 'error');
            } finally {
              submitBtn.disabled = false;
              btnText.style.display = 'inline';
              btnLoading.style.display = 'none';
            }
          });
        }
        
        function showMessage(message, type) {
          const container = document.getElementById('message-container');
          if (!container) return;
          
          container.innerHTML = '<div class="' + type + '-message fade-in">' + escapeHtml(message) + '</div>';
          
          // Auto-hide success messages
          if (type === 'success') {
            setTimeout(() => {
              container.innerHTML = '';
            }, 5000);
          }
        }
        
        function escapeHtml(text) {
          const div = document.createElement('div');
          div.textContent = text;
          return div.innerHTML;
        }
        
        // Error handling
        window.addEventListener('error', function(e) {
          console.error('Widget error:', e.error);
        });
        
      })();
    `;
	}

	// ========================================
	// UTILITY METHODS
	// ========================================

	private escapeHtml(text: string): string {
		if (!text) return '';
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}
}