let auth_url = "https://accounts.google.com/o/oauth2/v2/auth?";
const client_id =
    "41411264072-imfpagrud2tv1pa16i8tkpj5tu97v4ia.apps.googleusercontent.com";
const redirect_uri = chrome.identity.getRedirectURL();

document.addEventListener("DOMContentLoaded", function () {
    document
        .getElementById("googleSignIn")
        .addEventListener("click", oauthSignIn);
    document
        .getElementById("refreshBtn")
        .addEventListener("click", resetExpirationDate);
});

async function oauthSignIn() {
    const auth_params = {
        client_id: client_id,
        redirect_uri: redirect_uri,
        response_type: "token",
        scope: "https://www.googleapis.com/auth/calendar.readonly",
    };

    const url = new URLSearchParams(Object.entries(auth_params));
    url.toString();
    auth_url += url;
    chrome.identity.launchWebAuthFlow(
        { url: auth_url, interactive: true },
        function (response_url) {
            const urlParams = new URLSearchParams(response_url.split("#")[1]);
            const access_token = urlParams.get("access_token");
            const expiration_date =
                new Date().getTime() + urlParams.get("expires_in") * 1000;
            chrome.storage.sync.set(
                {
                    access_token: access_token,
                    expiration_date: expiration_date,
                },
                function () {
                    console.log("Access token and expiration date saved");
                    makeSignedInButton();
                }
            );
        }
    );
}

function getAccessTokenFromStorage() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(["access_token"], function (data) {
            resolve(data.access_token);
        });
    });
}

function checkAccessToken() {
    chrome.storage.sync.get(["expiration_date"], function (data) {
        if (
            data.expiration_date < new Date().getTime() ||
            !data.expiration_date
        ) {
            chrome.storage.sync.remove(["access_token", "expiration_date"]);
            document.getElementById("getEventsBtn").disabled = true;
            console.log("Access token expired");
        } else {
            makeSignedInButton();
        }
    });
}

function resetExpirationDate() {
    chrome.storage.sync.get(["expiration_date"], function (data) {
        let expiration_date = new Date().getTime();
        chrome.storage.sync.set({ expiration_date: expiration_date });
        console.log("Expiration date reset");
    });
}

function makeSignedInButton() {
    let oldButton = document.getElementById("googleSignIn");
    let newButton = document.createElement("button");
    newButton.innerHTML = "You are already signed in";
    newButton.disabled = true;
    newButton.id = "googleSignIn";
    newButton.className = "logged-in-btn";
    oldButton.parentNode.replaceChild(newButton, oldButton);
    document.getElementById("getEventsBtn").disabled = false;
}
