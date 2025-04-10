function checkForValidUrl(tabId, changeInfo, tab) {
  if (tab.url.includes("when2meet.com/?")) {
    chrome.action.setIcon({
      path: "/public/icon.ico",
      tabId: tabId,
    });
  }
}

chrome.tabs.onUpdated.addListener(checkForValidUrl);

chrome.tabs.onActivated.addListener(function (activeInfo) {
  chrome.tabs.get(activeInfo.tabId, function (tab) {
    checkForValidUrl(activeInfo.tabId, {}, tab);
  });
});
