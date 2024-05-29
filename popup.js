async function getCalendarEvents(start, end, allTimes) {
    const access_token = await getAccessTokenFromStorage();

    const startTime = new Date(start * 1000);
    const endTime = new Date(end * 1000);
    console.log(startTime, endTime);

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

    try {
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
                        !recurringEvent.attendees ||
                        recurringEvent.attendees.some(
                            (attendee) =>
                                attendee.self &&
                                attendee.responseStatus === "accepted"
                        )
                            ? (recurringEvent.active = true)
                            : (recurringEvent.active = false);

                        if (
                            allTimes.includes(
                                Date.parse(recurringEvent.start.dateTime) / 1000
                            ) ||
                            allTimes.includes(
                                Date.parse(recurringEvent.end.dateTime) / 1000
                            )
                        ) {
                            confirmedEvents.push(recurringEvent);
                        }
                    });
                    return;
                }
            }

            !event.attendees ||
            event.attendees.some(
                (attendee) =>
                    attendee.self && attendee.responseStatus === "accepted"
            )
                ? (event.active = true)
                : (event.active = false);

            if (
                allTimes.includes(Date.parse(event.start.dateTime) / 1000) ||
                allTimes.includes(Date.parse(event.end.dateTime) / 1000)
            ) {
                confirmedEvents.push(event);
            }
        });
    } catch (error) {
        error_message = document.createElement("p");
        error_message.innerHTML = "Error: Google authentication failed";
        document.body.appendChild(error_message);
    }

    confirmedEvents = confirmedEvents.sort(
        (a, b) => new Date(a.start.dateTime) - new Date(b.start.dateTime)
    );

    var events_div = document.createElement("div");
    events_div.className = "events";
    events_div.setAttribute("id", "events");

    for (var i = 0; i < confirmedEvents.length; i++) {
        var event = document.createElement("div");
        event.className = "eventCard";
        startAttr = new Date(confirmedEvents[i].start.dateTime);
        startAttr.setMinutes(Math.floor(startAttr.getMinutes() / 15) * 15);
        startAttr.setSeconds(0);
        startAttr.setMilliseconds(0);
        let endAttr = new Date(confirmedEvents[i].end.dateTime);
        endAttr.setMinutes(Math.floor(endAttr.getMinutes() / 15) * 15);
        endAttr.setSeconds(0);
        endAttr.setMilliseconds(0);
        event.setAttribute("start", Math.floor(startAttr.getTime() / 1000));
        event.setAttribute("end", Math.floor(endAttr.getTime() / 1000));
        const startDate = new Date(confirmedEvents[i].start.dateTime);
        const endDate = new Date(confirmedEvents[i].end.dateTime);
        const start = `${startDate.toLocaleDateString()} @ ${startDate.toLocaleTimeString(
            [],
            { hour: "2-digit", minute: "2-digit" }
        )}`;
        const end = `${endDate.toLocaleDateString()} @ ${endDate.toLocaleTimeString(
            [],
            { hour: "2-digit", minute: "2-digit" }
        )}`;
        const dayOfWeek = new Date(
            confirmedEvents[i].start.dateTime
        ).toLocaleDateString("en-US", { weekday: "long" });

        let checked = confirmedEvents[i].active ? "checked" : "";
        event.innerHTML = `
            <div class="checkbox">
                <input type="checkbox" id="eventCheckbox${i}" name="eventCheckbox${i}" ${checked}>
            </div>
            <div>
                <h2>${confirmedEvents[i].summary} ${dayOfWeek}</h2>
                <p>${start}</p>
                <p>${end}</p>
            </div>`;
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

function generateRecurringEvents(event, startTime, endTime, days) {
    const allDays = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
    const events = [];

    days.forEach((day) => {
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
