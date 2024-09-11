chrome.runtime.onInstalled.addListener(() => {
  console.log("Nutritional Classifier Edge Extension Installed!");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "enable_classifier") {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      files: ['content.js']
    });
    console.log("Nutritional Classifier enabled!");
  }
});
