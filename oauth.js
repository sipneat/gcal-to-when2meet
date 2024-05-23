// Function to initiate sign-in and get the access token
async function oauthSignIn(client_id) {
    const redirect_uri = `https://${chrome.runtime.id}.chromiumapp.org/`;
    const auth_url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${client_id}&redirect_uri=${encodeURIComponent(
        redirect_uri
    )}&response_type=token&scope=https://www.googleapis.com/auth/calendar.readonly`;
    chrome.identity.launchWebAuthFlow(
        { url: auth_url, interactive: true },
        function (responseUrl) {
            let params = new URLSearchParams(responseUrl.split("#")[1]);
            let access_token = params.get("access_token");
            let expires_in = params.get("expires_in"); // in seconds
            let expiration_date = new Date().getTime() + expires_in * 1000; // convert to milliseconds
            chrome.storage.sync.set(
                {
                    access_token: access_token,
                    expiration_date: expiration_date,
                },
                function () {
                    console.log("Access token and expiration date saved");
                }
            );
        }
    );
}

// Function to get the access token from storage
function getAccessTokenFromStorage(callback) {
    chrome.storage.sync.get(
        ["access_token", "expiration_date"],
        function (data) {
            let access_token = data.access_token;
            let expiration_date = data.expiration_date;
            if (new Date().getTime() > expiration_date) {
                // The access token is expired, refresh it
                initiateSignIn();
            } else {
                // The access token is not expired, pass it to the callback
                callback(access_token);
            }
        }
    );
}

// Function to initiate sign-in when the "Sign in with Google" button is clicked
document.addEventListener("DOMContentLoaded", function () {
    document
        .getElementById("googleSignIn")
        .addEventListener("click", async function () {
            const key = await fetch("key.json");
            const data = await key.json();
            oauthSignIn(data.client_id);
        });
});

// Function to get the access token from storage when the extension is reopened
document.addEventListener("DOMContentLoaded", function () {
    getAccessTokenFromStorage(function (access_token) {
        console.log("Access token from storage: ", access_token);
    });
});
