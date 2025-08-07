// src/widget/widget.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewsService } from '../reviews/reviews.service';
import { CreateReviewDto } from '../reviews/dto/create-review.dto';

@Injectable()
export class WidgetService {
	constructor(
		private prisma: PrismaService,
		private reviewsService: ReviewsService,
	) { }

	// ========================================
	// MAIN API METHODS
	// ========================================

	async getWidgetSettings(siteId: string) {
		const site = await this.prisma.site.findUnique({
			where: { id: siteId },
			select: {
				id: true,
				name: true,
				domain: true,
				plan: true,
				settings: true,
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
	) {
		return await this.reviewsService.createPublicReview(
			siteId,
			createReviewDto,
			ipAddress,
			userAgent,
		);
	}

	async generateWidgetHtml(siteId: string) {
		try {
			const { site, settings } = await this.getWidgetSettings(siteId);
			const { reviews } = await this.getWidgetReviews(siteId);

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
			iframe: `<iframe src="${baseUrl}/widget/${siteId}" width="${width}" height="${height}" frameborder="0" scrolling="auto" title="${site.name} Reviews"></iframe>`,
			javascript: `
<div id="reviews-widget-${siteId}"></div>
<script>
(function() {
  const iframe = document.createElement('iframe');
  iframe.src = '${baseUrl}/widget/${siteId}';
  iframe.width = '${width}';
  iframe.height = '${height}';
  iframe.frameBorder = '0';
  iframe.scrolling = 'auto';
  iframe.title = '${site.name} Reviews';
  document.getElementById('reviews-widget-${siteId}').appendChild(iframe);
})();
</script>`,
			instructions: {
				html: 'Copy and paste this HTML code where you want the reviews widget to appear on your website.',
				javascript: 'Use this JavaScript version if you need more control over when the widget loads.',
				customization: 'You can adjust the width and height values to fit your design.',
			},
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
    <style>${css}</style>
</head>
<body>
    <div class="reviews-widget">
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
      <div class="review-item">
        <div class="review-header">
          <div class="review-author-section">
            <div class="review-author">${this.escapeHtml(review.authorName)}</div>
            ${settings.showDate ? `<div class="review-date">${new Date(review.createdAt).toLocaleDateString()}</div>` : ''}
          </div>
          ${settings.showRating ? `<div class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>` : ''}
        </div>
        <div class="review-comment">${this.escapeHtml(review.comment)}</div>
      </div>
    `).join('');
	}

	private buildSubmitFormSection(): string {
		return `
      <div class="submit-form">
        <h3 class="form-title">Leave a Review</h3>
        <div id="message-container"></div>
        <form id="review-form">
          ${this.buildFormFields()}
          <button type="submit" class="submit-btn">Submit Review</button>
        </form>
      </div>
    `;
	}

	private buildFormFields(): string {
		return `
      <div class="form-group">
        <label class="form-label" for="authorName">Your Name *</label>
        <input type="text" id="authorName" name="authorName" class="form-input" required maxlength="50">
      </div>
      
      <div class="form-group">
        <label class="form-label" for="authorEmail">Email (optional)</label>
        <input type="email" id="authorEmail" name="authorEmail" class="form-input" maxlength="100">
      </div>
      
      <div class="form-group">
        <label class="form-label">Rating *</label>
        <div class="rating-input" id="rating-stars">
          <span class="star" data-rating="1">★</span>
          <span class="star" data-rating="2">★</span>
          <span class="star" data-rating="3">★</span>
          <span class="star" data-rating="4">★</span>
          <span class="star" data-rating="5">★</span>
        </div>
        <input type="hidden" id="rating" name="rating" required>
      </div>
      
      <div class="form-group">
        <label class="form-label" for="comment">Your Review *</label>
        <textarea id="comment" name="comment" class="form-textarea" required minlength="10" maxlength="1000" placeholder="Tell us about your experience..."></textarea>
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
      }
      
      .reviews-widget {
        max-width: 100%;
        margin: 0 auto;
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
        transition: border-color 0.2s;
      }
      
      .form-input:focus,
      .form-textarea:focus {
        outline: none;
        border-color: ${settings.primaryColor};
        box-shadow: 0 0 0 3px ${settings.primaryColor}20;
      }
      
      .form-textarea {
        height: 80px;
        resize: vertical;
        font-family: inherit;
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
        transition: color 0.2s;
        user-select: none;
      }
      
      .star:hover,
      .star.active {
        color: #ffd700;
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
      }
      
      .submit-btn:hover:not(:disabled) {
        background: ${settings.primaryColor}dd;
        transform: translateY(-1px);
      }
      
      .submit-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
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
      }
      
      .success-message {
        background: #d1fae5;
        color: #065f46;
        border: 1px solid #a7f3d0;
      }
      
      .error-message {
        background: #fee2e2;
        color: #991b1b;
        border: 1px solid #fca5a5;
      }
    `;
	}

	private getResponsiveStyles(): string {
		return `
      @media (max-width: 480px) {
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
      
      @media (max-width: 320px) {
        body {
          padding: 10px;
        }
        
        .review-item,
        .submit-form {
          padding: 12px;
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
        
        // Initialize rating stars
        initRatingStars();
        
        // Initialize submit form
        initSubmitForm();
        
        function initRatingStars() {
          const stars = document.querySelectorAll('.star');
          const ratingInput = document.getElementById('rating');
          
          if (!stars.length || !ratingInput) return;
          
          stars.forEach(star => {
            star.addEventListener('click', function() {
              selectedRating = parseInt(this.dataset.rating);
              ratingInput.value = selectedRating;
              updateStars();
            });
            
            star.addEventListener('mouseenter', function() {
              const rating = parseInt(this.dataset.rating);
              highlightStars(rating);
            });
          });
          
          const ratingContainer = document.getElementById('rating-stars');
          if (ratingContainer) {
            ratingContainer.addEventListener('mouseleave', function() {
              updateStars();
            });
          }
          
          function updateStars() {
            stars.forEach((star, index) => {
              star.classList.toggle('active', index < selectedRating);
            });
          }
          
          function highlightStars(rating) {
            stars.forEach((star, index) => {
              star.classList.toggle('active', index < rating);
            });
          }
        }
        
        function initSubmitForm() {
          const form = document.getElementById('review-form');
          if (!form) return;
          
          form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            console.log('📝 Submitting review...');
            
            const submitBtn = form.querySelector('.submit-btn');
            const messageContainer = document.getElementById('message-container');
            
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
            messageContainer.innerHTML = '';
            
            // Collect form data
            const formData = new FormData(form);
            const reviewData = {
              authorName: formData.get('authorName')?.toString()?.trim(),
              authorEmail: formData.get('authorEmail')?.toString()?.trim() || undefined,
              rating: parseInt(formData.get('rating')?.toString() || '0'),
              comment: formData.get('comment')?.toString()?.trim()
            };
            
            // Client-side validation
            if (!reviewData.authorName || !reviewData.comment || !reviewData.rating) {
              showMessage('Please fill in all required fields.', 'error');
              resetSubmitButton(submitBtn);
              return;
            }
            
            try {
              const response = await fetch(API_BASE + '/widget/' + SITE_ID + '/reviews', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(reviewData)
              });
              
              const result = await response.json();
              
              if (response.ok) {
                const statusMessage = result.status === 'PENDING' 
                  ? 'Thank you for your review! It will be published after moderation.' 
                  : 'Thank you for your review! It has been published.';
                
                showMessage(statusMessage, 'success');
                
                // Reset form
                form.reset();
                selectedRating = 0;
                document.querySelectorAll('.star').forEach(star => {
                  star.classList.remove('active');
                });
                
                console.log('✅ Review submitted successfully');
                
                // Reload after 3 seconds
                setTimeout(() => {
                  location.reload();
                }, 3000);
                
              } else {
                throw new Error(result.message || 'Failed to submit review');
              }
              
            } catch (error) {
              console.error('❌ Review submission error:', error);
              showMessage('Error: ' + error.message, 'error');
            } finally {
              resetSubmitButton(submitBtn);
            }
          });
          
          function showMessage(text, type) {
            const messageContainer = document.getElementById('message-container');
            if (messageContainer) {
              messageContainer.innerHTML = '<div class="' + type + '-message">' + text + '</div>';
            }
          }
          
          function resetSubmitButton(btn) {
            btn.disabled = false;
            btn.textContent = 'Submit Review';
          }
        }
        
      })();
    `;
	}

	// ========================================
	// UTILITIES
	// ========================================

	private escapeHtml(text: string): string {
		if (!text) return '';
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}
}