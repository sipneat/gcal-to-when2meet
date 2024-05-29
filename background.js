chrome.tabs.onActivated.addListener(function (info) {
    chrome.tabs.get(info.tabId, function (change) {
        if (change.url.includes("when2meet.com/?")) {
            chrome.action.setIcon({
                path: "/public/icon.ico",
                tabId: info.tabId,
            });
            return;
        } else {
            chrome.action.setIcon({
                path: "/public/icon_disabled.ico",
                tabId: info.tabId,
            });
        }
    });
});
