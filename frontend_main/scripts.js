/**
 * JavaScript script for the RUBLE Farming App landing page.
 * This script handles background video switching, language switching, fade-in animations,
 * and mobile menu toggling. It loads localized content from JSON files based on the selected language
 * and enhances the user experience with Intersection Observer for animations.
 */

// Background Video Switching
document.addEventListener('DOMContentLoaded', function () {
    // Array of video elements for the background video slider
    const videos = [
        document.getElementById('video1'),
        document.getElementById('video2'),
        document.getElementById('video3'),
        document.getElementById('video4')
    ];
    let currentVideoIndex = 0; // Track the current video index

    /**
     * Switch the visible background video in the video slider.
     * Hides the current video and shows the next one in the array, looping back to the first video.
     */
    function switchVideo() {
        videos[currentVideoIndex].style.display = 'none'; // Hide the current video
        currentVideoIndex = (currentVideoIndex + 1) % videos.length; // Move to the next video index
        videos[currentVideoIndex].style.display = 'block'; // Show the next video
    }

    // Switch videos every 2 seconds
    setInterval(switchVideo, 2000);

    // Fade-In Animation with Intersection Observer
    const fadeElements = document.querySelectorAll('.fade-in'); // Select all elements with the fade-in class

    const observerOptions = {
        threshold: 0.1 // Trigger when 10% of the element is visible
    };

    // Create an Intersection Observer to handle fade-in animations
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible'); // Add the visible class to trigger the fade-in
                observer.unobserve(entry.target); // Stop observing once the animation is triggered
            }
        });
    }, observerOptions);

    // Observe each fade-in element
    fadeElements.forEach(element => {
        observer.observe(element);
    });
});

// Language Switching
let currentLanguage = "en"; // Default language is English

/**
 * Load localized content for the landing page based on the selected language.
 * Fetches the appropriate JSON file (en.json or ru.json) and updates the page content.
 * @param {string} lang - The language code ('en' or 'ru').
 */
function loadLanguageContent(lang) {
    fetch(`assets/${lang}.json`)
        .then(response => response.json())
        .then(data => {
            // Update page content with localized text
            document.querySelector(".hero-title").innerHTML = data.heroTitle;
            document.querySelector(".hero-description").innerHTML = data.heroDescription;
            document.querySelector(".hero-disclaimer").innerHTML = data.heroDisclaimer;
            document.querySelector(".comic1").innerHTML = data.comic1;
            document.querySelector(".video-title").innerHTML = data.videoTitle;
            document.querySelector(".video-description-1").innerHTML = data.videoDescription1;
            // Note: 'tinnerHTML' is a typo and should be 'innerHTML'
            document.querySelector(".video-description-2").innerHTML = data.videoDescription2;
            document.querySelector(".video-description-3").innerHTML = data.videoDescription3;
            document.querySelector(".video-description-4").innerHTML = data.videoDescription4;
            document.querySelector(".video-description-5").innerHTML = data.videoDescription5;
            document.querySelector(".video-description-6").innerHTML = data.videoDescription6;
            // Note: video-description-7 is not present in index.html, this line will throw an error
            document.querySelector(".video-description-7").innerHTML = data.videoDescription7;
            document.querySelector(".comic2").innerHTML = data.comic2;
            document.querySelector(".cta-description").innerHTML = data.ctaDescription;
            document.querySelector(".cta-button").innerHTML = data.ctaButton;
            // Note: Missing dot (.) before 'caller-button', this will throw an error
            document.querySelector(".caller-button").innerHTML = data.callerButton;
            // Update the language button text based on the current language
            document.querySelector(".language-button").innerHTML = lang === "en" ? "EN" : "RU";
        })
        .catch(error => console.error('Error loading language content:', error));
}

/**
 * Switch the language between English ('en') and Russian ('ru').
 * Updates the page content by calling loadLanguageContent with the new language.
 */
function switchLanguage() {
    currentLanguage = currentLanguage === "en" ? "ru" : "en";
    loadLanguageContent(currentLanguage);
}

// Load the default language content when the page loads
document.addEventListener('DOMContentLoaded', function () {
    loadLanguageContent(currentLanguage);
});

/**
 * Toggle the visibility of the mobile navigation menu.
 * Adds or removes the 'show' class to display/hide the navigation links.
 */
function toggleMenu() {
    const navLinks = document.querySelector('.top-nav-links');
    navLinks.classList.toggle('show');
}

// Touch Interaction for Comic Frames
// Add touchstart event listeners to comic frames for potential interaction
document.querySelectorAll('.comic-frame').forEach(frame => {
    frame.addEventListener('touchstart', (e) => {
        // Placeholder for additional touch interaction logic
        // Currently empty, but can be used to enhance mobile user experience
    });
});

// Note: This function is a duplicate of the earlier toggleMenu function
// The second implementation is redundant and can be removed
function toggleMenu() {
    const navLinks = document.querySelector('.top-nav-links');
    if (navLinks.classList.contains('show')) {
        navLinks.classList.remove('show');
    } else {
        navLinks.classList.add('show');
    }
}