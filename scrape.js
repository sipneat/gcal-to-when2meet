let access_token;
document.addEventListener("DOMContentLoaded", function () {
    getAccessTokenFromStorage(function (result) {
        access_token = result;
    });

    let scrapeBtn = document.getElementById("scrapeBtn");
    if (
        !chrome.tabs.query(
            { active: true, currentWindow: true },
            function (tabs) {
                const url = tabs[0].url;
                if (!url.includes("when2meet.com/?")) {
                    scrapeBtn.disabled = true;
                    scrapeBtn.innerHTML = "Please navigate to a When2Meet page";
                } else scrapeBtn.addEventListener("click", scrape);
            }
        )
    );
});

function scrape() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const url = tabs[0].url;
        if (!url.startsWith("chrome://")) {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tabs[0].id },
                    function: functionToInject,
                },
                handleResponse
            );
        }
    });
}

function functionToInject() {
    let regex = /YouTime(\d+)/;
    let times = [];

    function findTimeElements(node) {
        if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.id &&
            regex.test(node.id)
        ) {
            let match = regex.exec(node.id);
            times.push(parseInt(match[1]));
        } else {
            node.childNodes.forEach(findTimeElements);
        }
    }

    findTimeElements(document.body);

    times.sort((a, b) => a - b);

    return times;
}

async function handleResponse(result) {
    let times = result[0].result;
    let startTime = times[0];
    let endTime = times[times.length - 1];

    let busyTimes = await getCalendarEvents(startTime, endTime, access_token);
    let freeTimes = times.filter((time) => !busyTimes.includes(time));

    console.log("Free times: ", freeTimes);

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            function: triggerOnMouseDown,
            args: [freeTimes],
        });
    });
}

function triggerOnMouseDown(freeTimes) {
    let delay = 10;

    let clickElement = (time) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                let element = document.getElementById("YouTime" + time);
                if (element) {
                    console.log("Clicking on element: ", element.id);
                    let mouseDownEvent = new MouseEvent("mousedown", {
                        view: window,
                        bubbles: true,
                        cancelable: true,
                    });
                    let mouseUpEvent = new MouseEvent("mouseup", {
                        view: window,
                        bubbles: true,
                        cancelable: true,
                    });
                    let clickEvent = new MouseEvent("click", {
                        view: window,
                        bubbles: true,
                        cancelable: true,
                    });
                    element.dispatchEvent(mouseDownEvent);
                    element.dispatchEvent(mouseUpEvent);
                    element.dispatchEvent(clickEvent);
                }
                resolve();
            }, delay);
        });
    };

    let promise = Promise.resolve();
    for (let time of freeTimes) {
        promise = promise.then(() => clickElement(time));
    }
}
