// Extension install hone pe welcome message
chrome.runtime.onInstalled.addListener(() => {
  console.log('YouTube Bookmarks Extension installed successfully!');
});

// Tab update detect karo
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com/watch')) {
    // Content script inject karo agar needed ho
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }).catch(err => {
      // Script already injected hai, ignore error
    });
    
    chrome.scripting.insertCSS({
      target: { tabId: tabId },
      files: ['styles.css']
    }).catch(err => {
      // CSS already injected hai, ignore error
    });
  }
});

// Storage changes listen karo (optional - for sync across tabs)
chrome.storage.onChanged.addListener((changes, namespace) => {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(`Storage key "${key}" changed:`, {
      oldValue,
      newValue
    });
  }
});