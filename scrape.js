let access_token, freeTimes;
document.addEventListener("DOMContentLoaded", function () {
    checkAccessToken();

    let getEventsBtn = document.getElementById("getEventsBtn");
    if (
        !chrome.tabs.query(
            { active: true, currentWindow: true },
            function (tabs) {
                const url = tabs[0].url;
                if (!url.includes("when2meet.com/?")) {
                    getEventsBtn.disabled = true;
                    getEventsBtn.innerHTML =
                        "Please navigate to a When2Meet page";
                } else getEventsBtn.addEventListener("click", scrape);
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

let times, busyTimes;
async function handleResponse(result) {
    times = result[0].result;
    let startTime = times[0];
    let endTime = times[times.length - 1];

    busyTimes = await getCalendarEvents(startTime, endTime, times);

    document.getElementById("getEventsBtn").disabled = true;

    let btns_div = document.createElement("div");
    btns_div.className = "buttons";
    let fillBtn = document.createElement("button");
    fillBtn.innerHTML = "Fill in when2meet";
    fillBtn.id = "fillBtn";
    fillBtn.addEventListener("click", fillEvents);
    btns_div.appendChild(fillBtn);
    document.body.appendChild(btns_div);
}

function fillEvents() {
    let freeTimes = times.filter((time) => !busyTimes.includes(time));

    let checkboxes = document.querySelectorAll("input[type='checkbox']");
    checkboxes.forEach((checkbox) => {
        if (!checkbox.checked) {
            let start = parseInt(
                checkbox.parentElement.parentElement.getAttribute("start")
            );
            let end = parseInt(
                checkbox.parentElement.parentElement.getAttribute("end")
            );
            for (let i = start; i < end; i += 900) {
                if (!freeTimes.includes(i)) {
                    freeTimes.push(i);
                }
            }
        }
    });

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
