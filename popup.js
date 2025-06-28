// Current tab ki info fetch karo
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
  const tab = tabs[0];
  const content = document.getElementById('content');
  
  // Check karo ki YouTube video page hai ya nahi
  if (tab.url && tab.url.includes('youtube.com/watch')) {
    const urlParams = new URLSearchParams(new URL(tab.url).search);
    const videoId = urlParams.get('v');
    
    // Bookmarks fetch karo
    chrome.storage.sync.get([videoId], (result) => {
      const bookmarks = result[videoId] ? JSON.parse(result[videoId]) : [];
      displayVideoStats(bookmarks, videoId);
    });
  } else {
    displayNoVideo();
  }
});

// Video stats display karo
function displayVideoStats(bookmarks, videoId) {
  const content = document.getElementById('content');
  
  // Total bookmarks count karo
  chrome.storage.sync.get(null, (allData) => {
    const totalVideos = Object.keys(allData).length;
    let totalBookmarks = 0;
    
    for (let key in allData) {
      try {
        const videoBookmarks = JSON.parse(allData[key]);
        totalBookmarks += videoBookmarks.length;
      } catch (e) {}
    }
    
    content.innerHTML = `
      <div class="status">
        <strong>Current Video:</strong> ${bookmarks.length} bookmark${bookmarks.length !== 1 ? 's' : ''}
      </div>
      
      <div class="bookmark-stats">
        <div class="stat-box">
          <div class="stat-number">${bookmarks.length}</div>
          <div class="stat-label">This Video</div>
        </div>
        <div class="stat-box">
          <div class="stat-number">${totalBookmarks}</div>
          <div class="stat-label">Total Bookmarks</div>
        </div>
        <div class="stat-box">
          <div class="stat-number">${totalVideos}</div>
          <div class="stat-label">Videos Saved</div>
        </div>
      </div>
      
      <div class="action-buttons">
        <button id="exportBtn">Export All</button>
        <button id="clearVideoBtn" class="danger">Clear This Video</button>
      </div>
      
      <div class="instructions">
        <h3>How to use:</h3>
        <ul>
          <li>Video dekhte time bookmark button click karo</li>
          <li>Bookmark pe click karke us time pe jump karo</li>
          <li>Description edit karne ke liye text pe click karo</li>
          <li>Delete karne ke liye × button use karo</li>
        </ul>
      </div>
    `;
    
    // Event listeners add karo
    document.getElementById('exportBtn').addEventListener('click', () => exportAllBookmarks());
    document.getElementById('clearVideoBtn').addEventListener('click', () => clearVideoBookmarks(videoId));
  });
}

// No video page display
function displayNoVideo() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="no-video">
      <p>YouTube video page pe jao to use bookmarks!</p>
      <p style="font-size: 40px; margin: 20px 0;">📺</p>
    </div>
    
    <div class="instructions">
      <h3>Features:</h3>
      <ul>
        <li>YouTube videos pe timestamps save karo</li>
        <li>Bookmarks pe notes add karo</li>
        <li>Easily navigate between saved timestamps</li>
        <li>Export your bookmarks for backup</li>
      </ul>
    </div>
  `;
}

// Export all bookmarks
function exportAllBookmarks() {
  chrome.storage.sync.get(null, (allData) => {
    const exportData = {
      exportDate: new Date().toISOString(),
      bookmarks: {}
    };
    
    for (let videoId in allData) {
      try {
        exportData.bookmarks[videoId] = JSON.parse(allData[videoId]);
      } catch (e) {}
    }
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `youtube-bookmarks-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  });
}

// Clear current video bookmarks
function clearVideoBookmarks(videoId) {
  if (confirm('Is video ke saare bookmarks delete ho jayenge. Sure ho?')) {
    chrome.storage.sync.remove(videoId, () => {
      window.close();
    });
  }
}