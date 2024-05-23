document.addEventListener("DOMContentLoaded", function () {
    getAccessTokenFromStorage(function (access_token) {
        console.log("Access token from storage: ", access_token);
        getCalendarEvents(1620810000, 1620896400, access_token);
    });
});

async function getCalendarEvents(start, end, access_token) {
    // Start and end are in unix timestamp in seconds
    const startTime = new Date(start * 1000).toISOString();
    const endTime = new Date(end * 1000).toISOString();
    console.log(startTime, endTime);
    /*const response = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=" +
            startTime +
            "&timeMax=" +
            endTime,
        {*/
    const response = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=2024-05-12T00:00:00Z&timeMax=2024-05-17T23:59:59Z",
        {
            headers: {
                Authorization: "Bearer " + access_token,
            },
        }
    );
    let data = await response.json();

    let confirmedEvents = data.items
        .reduce((acc, event) => {
            if (event.id.split("_")[1]) {
                return acc;
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
                    const allDays = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
                    if (days.length === 1) {
                        if (
                            !event.attendees ||
                            event.attendees.some((attendee) => {
                                return (
                                    attendee.self &&
                                    attendee.responseStatus === "accepted"
                                );
                            })
                        ) {
                            acc.push(event);
                        }
                        return acc;
                    }
                    const eventDay =
                        allDays[new Date(event.start.dateTime).getDay()];
                    days = days.filter((day) => day !== eventDay);

                    const clonedEvents = days.map((day) => {
                        const dayIndex = allDays.indexOf(day);
                        const newStartDate = new Date(event.start.dateTime);
                        newStartDate.setDate(
                            newStartDate.getDate() -
                                newStartDate.getDay() +
                                dayIndex
                        );
                        const newEndDate = new Date(event.end.dateTime);
                        newEndDate.setDate(
                            newEndDate.getDate() -
                                newEndDate.getDay() +
                                dayIndex
                        );

                        return {
                            ...event,
                            start: { dateTime: newStartDate.toISOString() },
                            end: { dateTime: newEndDate.toISOString() },
                        };
                    });

                    acc.push(event, ...clonedEvents);
                    return acc;
                }
            }

            if (
                !event.attendees ||
                event.attendees.some((attendee) => {
                    return (
                        attendee.self && attendee.responseStatus === "accepted"
                    );
                })
            ) {
                acc.push(event);
            }

            return acc;
        }, [])
        .reverse();

    var events_div = document.createElement("div");
    events_div.setAttribute("id", "events");
    for (var i = 0; i < confirmedEvents.length; i++) {
        var event = document.createElement("div");
        const start = Math.floor(
            new Date(confirmedEvents[i].start.dateTime).getTime() / 1000
        );
        /*new Date(confirmedEvents[i].start.dateTime).toLocaleTimeString(
                "en-US",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                }
            );*/

        const end = Math.floor(
            new Date(confirmedEvents[i].end.dateTime).getTime() / 1000
        );
        /*new Date(confirmedEvents[i].end.dateTime).toLocaleTimeString(
                "en-US",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                }
            );*/

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
