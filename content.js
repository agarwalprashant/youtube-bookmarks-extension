// YouTube video player aur bookmarks ke liye variables
let videoPlayer;
let currentVideo = "";
let bookmarksContainer;

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
  const newBookmark = {
    time: currentTime,
    desc: focusInput ? "" : `Bookmark at ${formatTime(currentTime)}`,
    id: Date.now()
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
      const lastBookmark = document.querySelector('.bookmark-item:last-child .bookmark-desc');
      if (lastBookmark) {
        lastBookmark.focus();
        lastBookmark.select();
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
  
  const timeSpan = document.createElement("span");
  timeSpan.className = "bookmark-time";
  timeSpan.textContent = formatTime(bookmark.time);
  timeSpan.onclick = () => playAtTime(bookmark.time);
  
  const descSpan = document.createElement("span");
  descSpan.className = "bookmark-desc";
  descSpan.textContent = bookmark.desc;
  descSpan.contentEditable = true;
  descSpan.onblur = () => updateBookmarkDescription(bookmark.id, descSpan.textContent);
  
  // Prevent YouTube keyboard shortcuts when editing
  descSpan.onkeydown = (e) => {
    e.stopPropagation();
  };
  descSpan.onkeyup = (e) => {
    e.stopPropagation();
  };
  descSpan.onkeypress = (e) => {
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

// YouTube controls mein bookmark button add karo
const addBookmarkButton = () => {
  const youtubeLeftControls = document.querySelector(".ytp-left-controls");
  
  if (!youtubeLeftControls || document.querySelector(".bookmark-btn")) return;
  
  const bookmarkBtn = document.createElement("button");
  bookmarkBtn.className = "ytp-button bookmark-btn";
  bookmarkBtn.title = "Add bookmark at current time";

  const bookmarkImg = document.createElement("img");
  bookmarkImg.src = chrome.runtime.getURL('image.png');
  bookmarkImg.alt = "Bookmark";
  bookmarkImg.style.width = "20px";
  bookmarkImg.style.height = "20px";
  bookmarkBtn.appendChild(bookmarkImg);
  
  bookmarkBtn.onclick = addNewBookmarkEventHandler;
  youtubeLeftControls.appendChild(bookmarkBtn);
};

// Export bookmarks to JSON file
const exportBookmarks = async () => {
  const bookmarks = await fetchBookmarks();

  if (bookmarks.length === 0) {
    showNotification("No bookmarks to export!");
    return;
  }

  const exportData = {
    exportDate: new Date().toISOString(),
    bookmarks: {
      [currentVideo]: bookmarks
    }
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'save.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showNotification("Bookmarks exported!");
};

// Import bookmarks from JSON file
const importBookmarks = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);

        if (!data.bookmarks) {
          showNotification("Invalid bookmark file!");
          return;
        }

        // Import all bookmarks from the file
        for (const [videoId, bookmarks] of Object.entries(data.bookmarks)) {
          chrome.storage.sync.set({
            [videoId]: JSON.stringify(bookmarks)
          });
        }

        // Refresh display if current video has imported bookmarks
        if (data.bookmarks[currentVideo]) {
          displayBookmarks();
        }

        const videoCount = Object.keys(data.bookmarks).length;
        showNotification(`Imported bookmarks for ${videoCount} video(s)!`);
      } catch (err) {
        showNotification("Error reading file!");
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  input.click();
};

// Bookmarks panel create karo
const createBookmarksPanel = () => {
  // Remove any existing panels first
  document.querySelectorAll(".bookmarks-panel").forEach(p => p.remove());

  const panel = document.createElement("div");
  panel.className = "bookmarks-panel";
  panel.innerHTML = `
    <div class="bookmarks-header">
      <h3>Video Bookmarks</h3>
      <div class="header-buttons">
        <button class="import-btn" title="Import bookmarks">⬆</button>
        <button class="export-btn" title="Export bookmarks">⬇</button>
        <button class="toggle-panel">−</button>
      </div>
    </div>
    <div class="bookmarks-list"></div>
    <div class="resize-handle"></div>
  `;

  document.body.appendChild(panel);
  bookmarksContainer = panel.querySelector(".bookmarks-list");

  // Panel toggle functionality
  const toggleBtn = panel.querySelector(".toggle-panel");
  toggleBtn.onclick = () => {
    panel.classList.toggle("collapsed");
    toggleBtn.textContent = panel.classList.contains("collapsed") ? "+" : "−";
  };

  // Export button functionality
  const exportBtn = panel.querySelector(".export-btn");
  exportBtn.onclick = exportBookmarks;

  // Import button functionality
  const importBtn = panel.querySelector(".import-btn");
  importBtn.onclick = importBookmarks;

  // Make panel draggable
  const header = panel.querySelector(".bookmarks-header");
  let isDragging = false;
  let dragOffsetX, dragOffsetY;

  header.style.cursor = "grab";

  header.onmousedown = (e) => {
    if (e.target.tagName === "BUTTON") return;
    isDragging = true;
    header.style.cursor = "grabbing";
    dragOffsetX = e.clientX - panel.offsetLeft;
    dragOffsetY = e.clientY - panel.offsetTop;
    e.preventDefault();
  };

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    panel.style.left = (e.clientX - dragOffsetX) + "px";
    panel.style.top = (e.clientY - dragOffsetY) + "px";
    panel.style.right = "auto";
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    header.style.cursor = "grab";
  });

  // Make panel resizable
  const resizeHandle = panel.querySelector(".resize-handle");
  let isResizing = false;

  resizeHandle.onmousedown = (e) => {
    isResizing = true;
    e.preventDefault();
  };

  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;
    const newWidth = e.clientX - panel.offsetLeft;
    const newHeight = e.clientY - panel.offsetTop;
    if (newWidth > 200) panel.style.width = newWidth + "px";
    if (newHeight > 100) panel.style.height = newHeight + "px";
  });

  document.addEventListener("mouseup", () => {
    isResizing = false;
  });
};

// Initialize extension
const initializeExtension = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  currentVideo = urlParams.get("v");

  if (!currentVideo) return;

  // Remove all old panels when switching videos
  document.querySelectorAll(".bookmarks-panel").forEach(p => p.remove());

  // Wait for video player to load
  const checkForPlayer = setInterval(() => {
    videoPlayer = document.querySelector("video");
    if (videoPlayer) {
      clearInterval(checkForPlayer);
      addBookmarkButton();
      createBookmarksPanel();
      displayBookmarks();
    }
  }, 1000);
};

// Page load hone pe initialize karo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeExtension);
} else {
  initializeExtension();
}

// Timeline pe bookmark dots add karo
const updateTimelineDots = (bookmarks) => {
  // Previous dots remove karo
  const existingDots = document.querySelectorAll('.bookmark-timeline-dot');
  existingDots.forEach(dot => dot.remove());
  
  if (!videoPlayer || bookmarks.length === 0) return;
  
  const progressBar = document.querySelector('.ytp-progress-bar');
  if (!progressBar) return;
  
  const videoDuration = videoPlayer.duration;
  if (!videoDuration) return;
  
  bookmarks.forEach(bookmark => {
    const dot = document.createElement('div');
    dot.className = 'bookmark-timeline-dot';
    dot.title = `${formatTime(bookmark.time)} - ${bookmark.desc}`;
    
    // Position calculate karo (percentage of video length)
    const position = (bookmark.time / videoDuration) * 100;
    dot.style.left = `${position}%`;
    
    // Click pe us time pe jump karo
    dot.onclick = (e) => {
      e.stopPropagation();
      playAtTime(bookmark.time);
    };
    
    progressBar.appendChild(dot);
  });
};

// Keyboard shortcut handler for 'b' key
const handleKeyboardShortcuts = (e) => {
  // Check if 'b' key is pressed and no input field is focused
  if (e.key.toLowerCase() === 'b' &&
      !e.target.matches('input, textarea, [contenteditable="true"]') &&
      videoPlayer && currentVideo) {
    e.preventDefault();
    e.stopPropagation();

    // Add bookmark without pausing
    addNewBookmarkEventHandler(false);
  }
};

// URL change detect karo (for YouTube's SPA navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    initializeExtension();
  }
}).observe(document, { subtree: true, childList: true });

// Add keyboard event listener
document.addEventListener('keydown', handleKeyboardShortcuts, true);