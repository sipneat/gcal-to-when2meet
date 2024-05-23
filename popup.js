document.addEventListener("DOMContentLoaded", function () {
    document
        .getElementById("getEventsBtn")
        .addEventListener("click", function () {
            getAccessTokenFromStorage(function (access_token) {
                getCalendarEvents(1716912000, 1717739100, access_token);
            });
        });
});

function generateRecurringEvents(event, startTime, endTime, days) {
    const allDays = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
    const events = [];

    days.forEach((day) => {
        const eventStartDate = new Date(event.start.dateTime);
        const dayIndex = allDays.indexOf(day);
        let eventDate = new Date(event.start.dateTime);
        eventDate.setDate(
            eventDate.getDate() + ((7 + dayIndex - eventDate.getDay()) % 7)
        );

        while (eventDate < startTime) {
            eventDate.setDate(eventDate.getDate() + 7);
        }

        while (eventDate <= endTime) {
            const newEvent = JSON.parse(JSON.stringify(event));
            const eventDuration =
                new Date(event.end.dateTime) - new Date(event.start.dateTime);
            newEvent.start.dateTime = new Date(eventDate).toISOString();
            newEvent.end.dateTime = new Date(
                eventDate.getTime() + eventDuration
            ).toISOString();
            events.push(newEvent);
            eventDate.setDate(eventDate.getDate() + 7);
        }
    });

    return events;
}

async function getCalendarEvents(start, end, access_token) {
    const startTime = new Date(start * 1000);
    const endTime = new Date(end * 1000);
    console.log(startTime, endTime);

    console.log("Access token: ", access_token);

    const response = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=" +
            startTime.toISOString() +
            "&timeMax=" +
            endTime.toISOString(),
        {
            headers: {
                Authorization: "Bearer " + access_token,
            },
        }
    );

    let data = await response.json();
    let confirmedEvents = [];

    data.items.forEach((event) => {
        if (event.id.split("_")[1]) {
            return;
        }

        if (event.recurrence) {
            const ruleParts = event.recurrence[0].split(";");
            const rule = {};

            ruleParts.forEach((part) => {
                const [key, value] = part.split("=");
                rule[key] = value;
            });

            if (rule.BYDAY) {
                let days = rule.BYDAY.split(",");
                const eventDay = new Date(event.start.dateTime)
                    .toLocaleDateString("en-US", { weekday: "short" })
                    .toUpperCase();
                days = days.filter((day) => day !== eventDay);

                const recurringEvents = generateRecurringEvents(
                    event,
                    startTime,
                    endTime,
                    days
                );
                recurringEvents.forEach((recurringEvent) => {
                    if (
                        !recurringEvent.attendees ||
                        recurringEvent.attendees.some(
                            (attendee) =>
                                attendee.self &&
                                attendee.responseStatus === "accepted"
                        )
                    ) {
                        confirmedEvents.push(recurringEvent);
                    }
                });
                return;
            }
        }

        if (
            !event.attendees ||
            event.attendees.some(
                (attendee) =>
                    attendee.self && attendee.responseStatus === "accepted"
            )
        ) {
            confirmedEvents.push(event);
        }
    });

    confirmedEvents = confirmedEvents.sort(
        (a, b) => new Date(a.start.dateTime) - new Date(b.start.dateTime)
    );

    var events_div = document.createElement("div");
    events_div.setAttribute("id", "events");

    for (var i = 0; i < confirmedEvents.length; i++) {
        var event = document.createElement("div");
        const start = Math.floor(
            new Date(confirmedEvents[i].start.dateTime).getTime() / 1000
        );
        const start2 = new Date(
            confirmedEvents[i].start.dateTime
        ).toLocaleString();
        const end = Math.floor(
            new Date(confirmedEvents[i].end.dateTime).getTime() / 1000
        );
        const end2 = new Date(confirmedEvents[i].end.dateTime).toLocaleString();
        const dayOfWeek = new Date(
            confirmedEvents[i].start.dateTime
        ).toLocaleDateString("en-US", { weekday: "long" });

        event.innerHTML =
            confirmedEvents[i].summary +
            " - " +
            dayOfWeek +
            "<br>" +
            start +
            " - " +
            start2 +
            "<br>" +
            end +
            " - " +
            end2 +
            "<br><br>";
        events_div.appendChild(event);
    }

    document.body.appendChild(events_div);

    return confirmedEvents
        .map((event) => {
            let times = [];
            let start = new Date(event.start.dateTime);
            let end = new Date(event.end.dateTime);

            start.setMinutes(Math.floor(start.getMinutes() / 15) * 15);
            start.setSeconds(0);
            start.setMilliseconds(0);

            while (start < end) {
                times.push(Math.floor(start.getTime() / 1000));
                start.setMinutes(start.getMinutes() + 15);
            }

            return times;
        })
        .flat();
}
