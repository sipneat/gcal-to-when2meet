// Function to initiate sign-in and get the access token
function oauthSignIn(client_id, client_secret) {
    const redirect_uri = chrome.identity.getRedirectURL();
    const auth_url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${client_id}&redirect_uri=${encodeURIComponent(
        redirect_uri
    )}&response_type=code&scope=https://www.googleapis.com/auth/calendar.readonly&access_type=offline&prompt=consent`;

    chrome.identity.launchWebAuthFlow(
        { url: auth_url, interactive: true },
        function (redirect_url) {
            if (chrome.runtime.lastError) {
                console.log(chrome.runtime.lastError.message);
            } else {
                const urlParams = new URLSearchParams(
                    new URL(redirect_url).search
                );
                const code = urlParams.get("code");
                exchangeCodeForToken(client_id, client_secret, code);
            }
        }
    );
}

function exchangeCodeForToken(client_id, client_secret, code) {
    const redirect_uri = chrome.identity.getRedirectURL();
    const details = {
        code: code,
        client_id: client_id,
        client_secret: client_secret,
        redirect_uri: redirect_uri,
        grant_type: "authorization_code",
    };

    fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(details),
    })
        .then((response) => response.json())
        .then((data) => {
            const access_token = data.access_token;
            const refresh_token = data.refresh_token;
            const expiration_date =
                data.expires_in * 1000 + new Date().getTime();
            chrome.storage.sync.set({
                access_token: access_token,
                refresh_token: refresh_token,
                expiration_date: expiration_date,
            });
        })
        .catch((error) => console.error("Error:", error));
}

// Function to get the access token from storage
let called = false;
function getAccessTokenFromStorage(callback) {
    chrome.storage.sync.get(
        ["access_token", "expiration_date", "refresh_token"],
        async function (data) {
            let access_token = data.access_token;
            let expiration_date = data.expiration_date;
            let refresh_token = data.refresh_token;
            if (new Date().getTime() > expiration_date) {
                if (!called) makeRefreshButton();
                access_token = await refreshAccessToken(refresh_token);
                let expiration_date = new Date().getTime() + 3600 * 1000; // 1 hour
                chrome.storage.sync.set(
                    {
                        access_token: access_token,
                        expiration_date: expiration_date,
                    },
                    function () {
                        console.log("Access token and expiration date updated");
                        if (!called) makeSignedInButton();
                        called = true;
                    }
                );
            } else {
                // The access token is not expired, pass it to the callback
                if (!called) makeSignedInButton();
                called = true;
                callback(access_token);
            }
        }
    );
}

async function refreshAccessToken(refresh_token) {
    const response1 = await fetch("key.json");
    const data1 = await response1.json();
    const client_secret = data1.web.client_secret;
    const client_id = data1.web.client_id;

    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `client_id=${client_id}&client_secret=${client_secret}&refresh_token=${refresh_token}&grant_type=refresh_token`,
    });
    const data = await response.json();
    return data.access_token;
}

function resetExpirationDate() {
    chrome.storage.sync.get(["expiration_date"], function (data) {
        let expiration_date = new Date().getTime();
        chrome.storage.sync.set({ expiration_date: expiration_date });
        console.log("Expiration date reset");
    });
}

// Function to initiate sign-in when the "Sign in with Google" button is clicked
document.addEventListener("DOMContentLoaded", function () {
    document
        .getElementById("googleSignIn")
        .addEventListener("click", async function () {
            const response = await fetch("key.json");
            const data = await response.json();
            oauthSignIn(data.web.client_id, data.web.client_secret);
        });
    document
        .getElementById("refreshBtn")
        .addEventListener("click", resetExpirationDate);
});

// Function to get the access token from storage when the extension is reopened
document.addEventListener("DOMContentLoaded", function () {
    getAccessTokenFromStorage(function (result) {
        console.log("Access token: ", result);
    });
});
function makeRefreshButton() {
    let oldButton = document.getElementById("googleSignIn");
    let newButton = document.createElement("button");
    newButton.innerHTML = "Refreshing Google Sign in";
    newButton.disabled = true;
    newButton.id = "googleSignIn";
    newButton.className = "logged-in-btn";
    newButton.style.backgroundColor = "yellow";
    newButton.style.color = "black";
    oldButton.parentNode.replaceChild(newButton, oldButton);
}

function makeSignedInButton() {
    let oldButton = document.getElementById("googleSignIn");
    let newButton = document.createElement("button");
    newButton.innerHTML = "You are already signed in";
    newButton.disabled = true;
    newButton.className = "logged-in-btn";
    oldButton.parentNode.replaceChild(newButton, oldButton);
}
