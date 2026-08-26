// CampusX video player aur bookmarks ke liye variables
let videoPlayer;
let currentVideo = "";
let bookmarksContainer;
let lastVideoSrc = "";

// Chrome storage se bookmarks fetch karo
const fetchBookmarks = () => {
  return new Promise((resolve) => {
    chrome.storage.sync.get([currentVideo], (obj) => {
      resolve(obj[currentVideo] ? JSON.parse(obj[currentVideo]) : []);
    });
  });
};

// Bookmark add karne ka function
const addNewBookmarkEventHandler = async (focusInput = false) => {
  const currentTime = videoPlayer.currentTime;
  const newBookmarkId = Date.now();
  const newBookmark = {
    time: currentTime,
    desc: focusInput ? "" : `Bookmark at ${formatTime(currentTime)}`,
    id: newBookmarkId
  };

  const bookmarks = await fetchBookmarks();
  
  chrome.storage.sync.set({
    [currentVideo]: JSON.stringify([...bookmarks, newBookmark].sort((a, b) => a.time - b.time))
  });

  // UI update karo
  displayBookmarks();
  showNotification("Bookmark added successfully!");
  
  // Agar focusInput true hai to description field ko focus karo
  if (focusInput) {
    setTimeout(() => {
      // Find the newly created bookmark by its ID, not by position
      const newBookmarkElement = document.querySelector(`[data-bookmark-id="${newBookmarkId}"] .bookmark-desc`);
      if (newBookmarkElement) {
        // Clear the default text and focus for typing
        newBookmarkElement.textContent = "";
        newBookmarkElement.focus();
        
        // Place cursor at the beginning, ready for typing
        const range = document.createRange();
        const selection = window.getSelection();
        range.setStart(newBookmarkElement, 0);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }, 100);
  }
};

// Time ko MM:SS format mein convert karo
const formatTime = (seconds) => {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
};

// Bookmark delete karne ka function
const deleteBookmark = async (bookmarkId) => {
  const bookmarks = await fetchBookmarks();
  const updatedBookmarks = bookmarks.filter(b => b.id !== bookmarkId);
  
  chrome.storage.sync.set({
    [currentVideo]: JSON.stringify(updatedBookmarks)
  });
  
  displayBookmarks();
  showNotification("Bookmark deleted!");
};

// Bookmark pe click karne se video us time pe jump kare
const playAtTime = (time) => {
  videoPlayer.currentTime = time;
};

// Bookmarks display karne ka function
const displayBookmarks = async () => {
  const bookmarks = await fetchBookmarks();
  bookmarksContainer.innerHTML = "";

  if (bookmarks.length === 0) {
    bookmarksContainer.innerHTML = '<div class="no-bookmarks">No bookmarks yet. Click the bookmark button to add one!</div>';
    updateTimelineDots([]);
    return;
  }

  bookmarks.forEach(bookmark => {
    const bookmarkElement = createBookmarkElement(bookmark);
    bookmarksContainer.appendChild(bookmarkElement);
  });
  
  updateTimelineDots(bookmarks);
};

// Bookmark element create karo
const createBookmarkElement = (bookmark) => {
  const bookmarkDiv = document.createElement("div");
  bookmarkDiv.className = "bookmark-item";
  bookmarkDiv.setAttribute("data-bookmark-id", bookmark.id);
  
  const timeSpan = document.createElement("span");
  timeSpan.className = "bookmark-time";
  timeSpan.textContent = formatTime(bookmark.time);
  timeSpan.onclick = () => {
    // Pehle se selected bookmark se highlight hatao
    document.querySelectorAll('.bookmark-item.selected').forEach(el => el.classList.remove('selected'));
    // Current bookmark ko highlight karo
    bookmarkDiv.classList.add('selected');
    playAtTime(bookmark.time);
  };
  
  const descSpan = document.createElement("span");
  descSpan.className = "bookmark-desc";
  descSpan.textContent = bookmark.desc;
  descSpan.contentEditable = true;
  descSpan.onblur = () => updateBookmarkDescription(bookmark.id, descSpan.textContent);
  
  // Prevent keyboard shortcuts when editing
  descSpan.onkeydown = (e) => {
    e.stopPropagation();
  };
  descSpan.onkeyup = (e) => {
    e.stopPropagation();
  };
  
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-bookmark";
  deleteBtn.textContent = "×";
  deleteBtn.onclick = () => deleteBookmark(bookmark.id);
  
  bookmarkDiv.appendChild(timeSpan);
  bookmarkDiv.appendChild(descSpan);
  bookmarkDiv.appendChild(deleteBtn);
  
  return bookmarkDiv;
};

// Bookmark description update karo
const updateBookmarkDescription = async (bookmarkId, newDesc) => {
  const bookmarks = await fetchBookmarks();
  const bookmark = bookmarks.find(b => b.id === bookmarkId);
  if (bookmark) {
    bookmark.desc = newDesc;
    chrome.storage.sync.set({
      [currentVideo]: JSON.stringify(bookmarks)
    });
  }
};

// Notification show karo
const showNotification = (message) => {
  const notification = document.createElement("div");
  notification.className = "bookmark-notification";
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 2000);
};

// CampusX ke liye floating bookmark button add karo
const addFloatingBookmarkButton = () => {
  if (document.querySelector(".campusx-bookmark-btn")) return;
  
  const bookmarkBtn = document.createElement("button");
  bookmarkBtn.className = "campusx-bookmark-btn";
  bookmarkBtn.title = "Add bookmark at current time (Press B)";
  bookmarkBtn.innerHTML = `
    <svg height="20" viewBox="0 0 24 24" width="20">
      <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" fill="white"/>
    </svg>
  `;
  
  bookmarkBtn.onclick = addNewBookmarkEventHandler;
  document.body.appendChild(bookmarkBtn);
};

// Bookmarks panel create karo
const createBookmarksPanel = () => {
  const panel = document.createElement("div");
  panel.className = "bookmarks-panel campusx-panel";
  panel.innerHTML = `
    <div class="bookmarks-header draggable-header">
      <h3>Video Bookmarks</h3>
      <button class="toggle-panel">−</button>
    </div>
    <div class="bookmarks-list"></div>
    <div class="resize-handle"></div>
  `;
  
  document.body.appendChild(panel);
  bookmarksContainer = panel.querySelector(".bookmarks-list");
  
  // Panel default collapsed state mein start hoga
  panel.classList.add("collapsed");
  
  // Panel toggle functionality
  const toggleBtn = panel.querySelector(".toggle-panel");
  toggleBtn.textContent = "+";
  toggleBtn.onclick = () => {
    panel.classList.toggle("collapsed");
    toggleBtn.textContent = panel.classList.contains("collapsed") ? "+" : "−";
  };
  
  // Make panel draggable
  makePanelDraggable(panel);
  
  // Make panel resizable
  makePanelResizable(panel);
};

// Make bookmarks panel draggable
const makePanelDraggable = (panel) => {
  const header = panel.querySelector(".bookmarks-header");
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;
  
  // Get initial position from CSS
  const computedStyle = window.getComputedStyle(panel);
  const right = parseInt(computedStyle.right) || 20;
  const top = parseInt(computedStyle.top) || 100;
  
  // Convert right position to left position for dragging
  xOffset = window.innerWidth - right - panel.offsetWidth;
  yOffset = top;
  
  // Set initial position
  panel.style.left = xOffset + "px";
  panel.style.top = yOffset + "px";
  panel.style.right = "auto";
  
  const dragStart = (e) => {
    // Only allow dragging from header, not from toggle button
    if (e.target.classList.contains('toggle-panel')) return;
    
    if (e.type === "mousedown") {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
    } else {
      initialX = e.touches[0].clientX - xOffset;
      initialY = e.touches[0].clientY - yOffset;
    }
    
    if (e.target === header || header.contains(e.target)) {
      isDragging = true;
      header.style.cursor = "grabbing";
      panel.style.transition = "none";
    }
  };
  
  const dragEnd = () => {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
    header.style.cursor = "grab";
    panel.style.transition = "all 0.3s ease";
    
    // Keep panel within viewport bounds
    const rect = panel.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width;
    const maxY = window.innerHeight - rect.height;
    
    xOffset = Math.max(0, Math.min(xOffset, maxX));
    yOffset = Math.max(0, Math.min(yOffset, maxY));
    
    panel.style.left = xOffset + "px";
    panel.style.top = yOffset + "px";
  };
  
  const drag = (e) => {
    if (isDragging) {
      e.preventDefault();
      
      if (e.type === "mousemove") {
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
      } else {
        currentX = e.touches[0].clientX - initialX;
        currentY = e.touches[0].clientY - initialY;
      }
      
      xOffset = currentX;
      yOffset = currentY;
      
      panel.style.left = xOffset + "px";
      panel.style.top = yOffset + "px";
    }
  };
  
  // Mouse events
  header.addEventListener("mousedown", dragStart);
  document.addEventListener("mousemove", drag);
  document.addEventListener("mouseup", dragEnd);
  
  // Touch events for mobile
  header.addEventListener("touchstart", dragStart);
  document.addEventListener("touchmove", drag);
  document.addEventListener("touchend", dragEnd);
  
  // Prevent text selection while dragging
  header.addEventListener("selectstart", (e) => {
    if (isDragging) e.preventDefault();
  });
};

// Make bookmarks panel resizable from bottom-right corner
const makePanelResizable = (panel) => {
  const handle = panel.querySelector(".resize-handle");
  if (!handle) return;
  
  let isResizing = false;
  let startX, startY, startWidth, startHeight;
  
  const resizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing = true;
    
    startWidth = panel.offsetWidth;
    startHeight = panel.offsetHeight;
    
    if (e.type === "mousedown") {
      startX = e.clientX;
      startY = e.clientY;
    } else {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }
    
    panel.style.transition = "none";
    document.body.style.userSelect = "none";
  };
  
  const resizeMove = (e) => {
    if (!isResizing) return;
    e.preventDefault();
    
    let clientX, clientY;
    if (e.type === "mousemove") {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }
    
    const dx = clientX - startX;
    const dy = clientY - startY;
    
    const newWidth = Math.max(200, startWidth + dx);
    const newHeight = Math.max(100, startHeight + dy);
    
    panel.style.width = newWidth + "px";
    panel.style.height = newHeight + "px";
  };
  
  const resizeEnd = () => {
    if (!isResizing) return;
    isResizing = false;
    panel.style.transition = "all 0.3s ease";
    document.body.style.userSelect = "";
  };
  
  // Mouse events
  handle.addEventListener("mousedown", resizeStart);
  document.addEventListener("mousemove", resizeMove);
  document.addEventListener("mouseup", resizeEnd);
  
  // Touch events
  handle.addEventListener("touchstart", resizeStart);
  document.addEventListener("touchmove", resizeMove);
  document.addEventListener("touchend", resizeEnd);
};

// Course ID URL se extract karo
const getCourseId = () => {
  const pathParts = window.location.pathname.split('/');
  // URL format: /s/courses/653f50d1e4b0d2eae855480a/take
  const coursesIndex = pathParts.indexOf('courses');
  if (coursesIndex !== -1 && pathParts[coursesIndex + 1]) {
    return pathParts[coursesIndex + 1];
  }
  return pathParts.filter(p => p).join('_');
};

// Video title DOM se extract karo
const getVideoTitle = () => {
  // Video title video player ke neeche dikhta hai
  const selectors = [
    'h1', 'h2', 'h3',
    '[class*="title"]',
    '[class*="lesson-name"]',
    '[class*="video-title"]'
  ];
  
  // Video player ke baad pehla heading dhundho
  const videoEl = document.querySelector('video');
  if (videoEl) {
    // Video ke parent container ke baad title dhundho
    let container = videoEl.closest('[class*="player"]') || videoEl.parentElement;
    while (container) {
      const nextSibling = container.nextElementSibling;
      if (nextSibling) {
        // Check for headings in next sibling
        const heading = nextSibling.querySelector('h1, h2, h3') || nextSibling;
        if (heading && heading.textContent.trim()) {
          return heading.textContent.trim();
        }
      }
      container = container.parentElement;
    }
  }
  
  // Fallback: Try common selectors
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      const text = el.textContent.trim();
      // Skip very short or very long text, and common UI elements
      if (text.length > 3 && text.length < 200 && 
          !text.includes('Bookmark') && !text.includes('Video Bookmarks') &&
          !text.includes('Course Discussions') && !text.includes('Certificate')) {
        return text;
      }
    }
  }
  
  return null;
};

// Video identifier generate karo CampusX course ID + video title se
const generateVideoId = () => {
  const courseId = getCourseId();
  const videoTitle = getVideoTitle();
  
  if (videoTitle) {
    // Spaces ko underscore se replace karo, special chars hatao
    const cleanTitle = videoTitle.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
    return `cx_${courseId}_${cleanTitle}`;
  }
  
  // Agar title nahi mila toh video source se fallback
  if (videoPlayer && videoPlayer.currentSrc) {
    const srcHash = simpleHash(videoPlayer.currentSrc);
    return `cx_${courseId}_src${srcHash}`;
  }
  
  return `cx_${courseId}_unknown`;
};

// Simple hash function for fallback video identification
const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

// Initialize extension for CampusX
const initializeExtension = async () => {
  // Wait for video player to load
  const checkForPlayer = setInterval(() => {
    videoPlayer = document.querySelector("video");
    if (videoPlayer) {
      clearInterval(checkForPlayer);
      
      // Video title thoda late load hota hai, uska bhi wait karo
      const checkForTitle = setInterval(() => {
        const title = getVideoTitle();
        if (title || videoPlayer.currentSrc) {
          clearInterval(checkForTitle);
          
          lastVideoSrc = videoPlayer.currentSrc || "";
          currentVideo = generateVideoId();
          
          if (!currentVideo) return;
          
          // Clean up old panels (prevent duplicates)
          document.querySelectorAll(".bookmarks-panel.campusx-panel").forEach(p => p.remove());
          document.querySelectorAll(".custom-bookmark-progress").forEach(o => o.remove());
          
          addFloatingBookmarkButton();
          createBookmarksPanel();
          displayBookmarks();
          
          // Video source change listeners
          videoPlayer.addEventListener("loadeddata", checkForVideoChange);
          videoPlayer.addEventListener("loadstart", checkForVideoChange);
          
          console.log('CampusX: Initialized with video ID:', currentVideo);
        }
      }, 500);
      
      // Title ke liye max 10 seconds wait karo
      setTimeout(() => clearInterval(checkForTitle), 10000);
    }
  }, 1000);
};

// Page load hone pe initialize karo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeExtension);
} else {
  initializeExtension();
}

// Keyboard shortcut handler for 'b' key
const handleKeyboardShortcuts = (e) => {
  // Check if 'b' key is pressed and no input field is focused
  if (e.key.toLowerCase() === 'b' && 
      !e.target.matches('input, textarea, [contenteditable="true"]') &&
      videoPlayer && currentVideo) {
    e.preventDefault();
    e.stopPropagation();
    
    // Pause the video
    if (!videoPlayer.paused) {
      videoPlayer.pause();
    }
    
    // Add bookmark with focus enabled
    addNewBookmarkEventHandler(true);
  }
};

// Video source change detect karo (URL nahi badalta CampusX pe)
const checkForVideoChange = () => {
  const video = document.querySelector("video");
  if (video && video.currentSrc && video.currentSrc !== lastVideoSrc) {
    console.log('CampusX: Video source changed from', lastVideoSrc, 'to', video.currentSrc);
    lastVideoSrc = video.currentSrc;
    videoPlayer = video;
    
    // Thoda wait karo taaki title bhi update ho jaaye
    setTimeout(() => {
      const newVideoId = generateVideoId();
      if (newVideoId !== currentVideo) {
        currentVideo = newVideoId;
        console.log('CampusX: Switched to video:', currentVideo);
        displayBookmarks();
      }
    }, 1000);
  }
};

// Poll for video source changes every 2 seconds
setInterval(checkForVideoChange, 2000);

// URL change bhi detect karo (agar course switch ho)
let lastUrl = location.href;
new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    lastVideoSrc = "";
    initializeExtension();
  }
}).observe(document, { subtree: true, childList: true });

// Add keyboard event listener
document.addEventListener('keydown', handleKeyboardShortcuts, true);

// Timeline pe bookmark dots add karo - Generic version for any video player
const updateTimelineDots = (bookmarks) => {
  console.log('CampusX: updateTimelineDots called with', bookmarks.length, 'bookmarks');
  
  // Previous dots remove karo
  const existingDots = document.querySelectorAll('.bookmark-timeline-dot');
  existingDots.forEach(dot => dot.remove());
  
  if (!videoPlayer) {
    console.log('CampusX: No video player found');
    return;
  }
  
  if (bookmarks.length === 0) {
    console.log('CampusX: No bookmarks to display');
    return;
  }
  
  // Try multiple possible progress bar selectors for different video players
  const progressBarSelectors = [
    '.ytp-progress-bar', // YouTube
    '.vjs-progress-holder', // Video.js
    '.plyr__progress', // Plyr
    '.jwplayer .jw-progress', // JW Player
    '.video-js .vjs-progress-holder', // Video.js alternative
    'progress[max]', // Generic HTML5 progress element
    '.progress-bar', // Generic progress bar
    '[role="progressbar"]', // ARIA progressbar
    '.seek-bar', // Generic seek bar
    '.timeline', // Generic timeline
    '.video-progress', // Common progress class
    '.player-progress', // Player progress
    '.controls progress', // Progress inside controls
    'video + * progress', // Progress element after video
    '.player-controls progress' // Progress in player controls
  ];
  
  let progressBar = null;
  for (const selector of progressBarSelectors) {
    progressBar = document.querySelector(selector);
    if (progressBar) {
      console.log('CampusX: Found progress bar with selector:', selector);
      break;
    }
  }
  
  // If no progress bar found, create our own overlay
  if (!progressBar) {
    console.log('CampusX: No progress bar found, creating custom overlay');
    progressBar = createCustomProgressOverlay();
  }
  
  if (!progressBar) {
    console.log('CampusX: Failed to create progress bar');
    return;
  }
  
  const videoDuration = videoPlayer.duration;
  if (!videoDuration) {
    console.log('CampusX: Video duration not available:', videoDuration);
    return;
  }
  
  console.log('CampusX: Adding', bookmarks.length, 'dots to progress bar');
  
  bookmarks.forEach((bookmark, index) => {
    const dot = document.createElement('div');
    dot.className = 'bookmark-timeline-dot';
    dot.title = `${formatTime(bookmark.time)} - ${bookmark.desc}`;
    
    // Position calculate karo (percentage of video length)
    const position = (bookmark.time / videoDuration) * 100;
    dot.style.left = `${position}%`;
    
    console.log(`CampusX: Adding dot ${index + 1} at ${position}% (${formatTime(bookmark.time)})`);
    
    // Click pe us time pe jump karo
    dot.onclick = (e) => {
      e.stopPropagation();
      playAtTime(bookmark.time);
    };
    
    progressBar.appendChild(dot);
  });
  
  console.log('CampusX: Timeline dots update completed');
};

// Custom progress overlay create karo agar koi progress bar nahi mila
const createCustomProgressOverlay = () => {
  console.log('CampusX: Creating custom progress overlay');
  
  // Remove existing overlay if present
  const existingOverlay = document.querySelector('.custom-bookmark-progress');
  if (existingOverlay) {
    existingOverlay.remove();
  }
  
  if (!videoPlayer) {
    console.log('CampusX: No video player for overlay');
    return null;
  }
  
  const videoRect = videoPlayer.getBoundingClientRect();
  console.log('CampusX: Video rect:', videoRect);
  
  const overlay = document.createElement('div');
  overlay.className = 'custom-bookmark-progress';
  overlay.style.cssText = `
    position: fixed;
    bottom: ${window.innerHeight - videoRect.bottom + 10}px;
    left: ${videoRect.left}px;
    width: ${videoRect.width}px;
    height: 6px;
    background: rgba(255, 255, 255, 0.4);
    z-index: 9999;
    pointer-events: none;
    border-radius: 3px;
  `;
  
  console.log('CampusX: Overlay styles:', overlay.style.cssText);
  
  document.body.appendChild(overlay);
  
  // Update overlay position when video is resized or moved
  const updateOverlayPosition = () => {
    if (!videoPlayer) return;
    const rect = videoPlayer.getBoundingClientRect();
    overlay.style.bottom = `${window.innerHeight - rect.bottom + 10}px`;
    overlay.style.left = `${rect.left}px`;
    overlay.style.width = `${rect.width}px`;
  };
  
  window.addEventListener('resize', updateOverlayPosition);
  
  console.log('CampusX: Custom overlay created successfully');
  return overlay;
};