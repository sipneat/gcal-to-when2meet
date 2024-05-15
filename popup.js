let access_token = "";

async function initiateSignIn() {
    // Get client_id from key.json
    try {
        const response = await fetch("key.json");
        const data = await response.json();
        oauthSignIn(data.web.client_id);
    } catch (error) {
        console.error("Error:", error);
    }
}

async function getCalendarEvents() {
    const response = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=2024-05-12T00:00:00Z&timeMax=2024-05-17T23:59:59Z",
        {
            headers: {
                Authorization: "Bearer " + access_token,
            },
        }
    );
    let data = await response.json();

    let seen = new Set();
    function getEventKey(event) {
        const date = new Date(event.start.dateTime);
        const day = date.toLocaleDateString("en-US", { weekday: "long" });
        console.log(day);
        const time = date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        });
        return `${day} ${time}`;
    }

    const confirmedEvents = data.items
        .filter((event) => {
            return (
                !event.attendees ||
                event.attendees.some((attendee) => {
                    return (
                        attendee.self && attendee.responseStatus === "accepted"
                    );
                })
            );
        })
        .filter((event) => {
            const key = getEventKey(event);
            return seen.has(key) ? false : seen.add(key);
        })
        .reverse();

    var events_div = document.createElement("div");
    events_div.setAttribute("id", "events");
    for (var i = 0; i < confirmedEvents.length; i++) {
        var event = document.createElement("div");
        const start = new Date(
            confirmedEvents[i].start.dateTime
        ).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
        const end = new Date(
            confirmedEvents[i].end.dateTime
        ).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
        const dayOfWeek = new Date(
            confirmedEvents[i].start.dateTime
        ).toLocaleDateString("en-US", { weekday: "long" });
        event.innerHTML =
            confirmedEvents[i].summary +
            " - " +
            dayOfWeek +
            "<br>" +
            start +
            "<br>" +
            end +
            "<br><br>";
        events_div.appendChild(event);
    }

    document.body.appendChild(events_div);
}

function oauthSignIn(client_id) {
    // Google's OAuth 2.0 endpoint for requesting an access token
    var oauth2Endpoint = "https://accounts.google.com/o/oauth2/v2/auth";

    // Create <form> element to submit parameters to OAuth 2.0 endpoint.
    var form = document.createElement("form");
    form.setAttribute("method", "GET"); // Send as a GET request.
    form.setAttribute("action", oauth2Endpoint);

    // Parameters to pass to OAuth 2.0 endpoint.
    var params = {
        client_id: client_id,
        redirect_uri: "http://localhost:8000",
        response_type: "token",
        scope: "https://www.googleapis.com/auth/calendar.readonly",
        include_granted_scopes: "true",
        state: "pass-through value",
    };

    // Add form parameters as hidden input values.
    for (var p in params) {
        var input = document.createElement("input");
        input.setAttribute("type", "hidden");
        input.setAttribute("name", p);
        input.setAttribute("value", params[p]);
        form.appendChild(input);
    }

    // Add form to page and submit it to open the OAuth 2.0 endpoint.
    document.body.appendChild(form);
    form.submit();
}

function getAccessTokenFromUrl() {
    const hash = window.location.hash.substr(1);
    const result = hash.split("&").reduce(function (result, item) {
        const parts = item.split("=");
        result[parts[0]] = parts[1];
        return result;
    }, {});
    return result.access_token;
}

window.onload = function () {
    access_token = getAccessTokenFromUrl();
    if (access_token) {
        console.log(access_token);
    }
};
