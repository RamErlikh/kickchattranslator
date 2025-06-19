// Content script for Kick Chat Translator Browser Extension
// This script runs on kick.com pages to inject translation functionality

(function() {
    'use strict';
    
    // Check if we're already injected
    if (window.kickTranslatorInjected) {
        return;
    }
    window.kickTranslatorInjected = true;

    // Only run on Kick.com pages
    if (!window.location.hostname.includes('kick.com')) {
        return;
    }

    // Inject a floating translator button
    function createTranslatorButton() {
        const button = document.createElement('div');
        button.id = 'kick-translator-button';
        button.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 16px;
                border-radius: 25px;
                cursor: pointer;
                font-family: Arial, sans-serif;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                transition: all 0.3s ease;
                user-select: none;
            ">
                🔤 Translator
            </div>
        `;
        
        button.addEventListener('click', openTranslator);
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
        });
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
        });
        
        document.body.appendChild(button);
    }

    // Open translator in a modal
    function openTranslator() {
        // Remove existing modal if any
        const existing = document.getElementById('kick-translator-modal');
        if (existing) {
            existing.remove();
            return;
        }

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'kick-translator-modal';
        modal.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div style="
                    background: white;
                    border-radius: 20px;
                    padding: 30px;
                    width: 90%;
                    max-width: 800px;
                    max-height: 90%;
                    overflow-y: auto;
                    position: relative;
                ">
                    <button id="close-translator" style="
                        position: absolute;
                        top: 15px;
                        right: 20px;
                        background: none;
                        border: none;
                        font-size: 24px;
                        cursor: pointer;
                        color: #666;
                    ">×</button>
                    
                    <iframe 
                        src="${chrome.runtime.getURL('index.html')}" 
                        style="
                            width: 100%;
                            height: 600px;
                            border: none;
                            border-radius: 10px;
                        "
                    ></iframe>
                </div>
            </div>
        `;

        // Add event listeners
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.remove();
            }
        });
        
        modal.querySelector('#close-translator').addEventListener('click', function() {
            modal.remove();
        });

        document.body.appendChild(modal);
    }

    // Auto-detect if we're on a channel page and show notification
    function detectChannelPage() {
        const url = window.location.pathname;
        const isChannelPage = url.match(/^\/[^\/]+\/?$/);
        
        if (isChannelPage) {
            // Show a notification that translator is available
            showTranslatorNotification();
        }
    }

    function showTranslatorNotification() {
        // Only show once per session
        if (sessionStorage.getItem('translator-notification-shown')) {
            return;
        }
        sessionStorage.setItem('translator-notification-shown', 'true');

        const notification = document.createElement('div');
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 80px;
                right: 20px;
                z-index: 10000;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 20px;
                border-radius: 15px;
                font-family: Arial, sans-serif;
                font-size: 14px;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                max-width: 300px;
                animation: slideIn 0.3s ease;
            ">
                <div style="font-weight: 600; margin-bottom: 5px;">🔤 Chat Translator Available!</div>
                <div style="font-size: 12px; opacity: 0.9;">Click the translator button to start translating chat messages</div>
            </div>
        `;

        // Add animation keyframes
        if (!document.getElementById('translator-animations')) {
            const style = document.createElement('style');
            style.id = 'translator-animations';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideIn 0.3s ease reverse';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    // Wait for page to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        createTranslatorButton();
        detectChannelPage();
        
        // Monitor for navigation changes (SPA)
        let currentUrl = window.location.href;
        const observer = new MutationObserver(() => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                setTimeout(detectChannelPage, 1000); // Wait for page to render
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
})(); 