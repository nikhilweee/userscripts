// ==UserScript==
// @name        Swim All Appointments
// @namespace   Violentmonkey Scripts
// @match       https://newportswimandfitnesscenter.trainerize.com/app/client/*/dash
// @grant       none
// @version     1.0
// @author      nikhilweee
// @description Trainerize Show All Appointments
// ==/UserScript==

let state = { times: [] };

function allElementsLoaded() {
  return (
    document.querySelectorAll("div.appointmentCarouselContainer").length > 0
  );
}

function runScriptWhenReady() {
  if (allElementsLoaded()) {
    console.log("violentmonkey connected");
    runScript();
  } else {
    console.log("violentmonkey waiting");
    setTimeout(runScriptWhenReady, 100);
  }
}

async function getAvailableTimes(name, data) {
  console.log(
    "fetching times for trainer",
    data.trainerExternalID,
    "on",
    data.startTimeUtc
  );
  let response = await fetch(
    "https://api.trainerize.com/v03/abcFinancial/getAvailableTimes",
    {
      headers: {
        "content-type": "application/json",
        authorization: state.authorization,
      },
      referrer: "https://newportswimandfitnesscenter.trainerize.com/",
      body: JSON.stringify(data),
      method: "POST",
    }
  );
  let responseJSON = await response.json();
  state.times[name] = [];
  responseJSON.startTimesUtc.forEach((timeStr) => {
    let time = new Date(timeStr + " UTC");
    // remove the four hour offset
    // time.setHours(time.getHours() - 4);
    state.times[name].push(time.toLocaleTimeString());
  });
  return [name, state.times[name]];
}

async function handleSwim() {
  // prepare request data for fetching available times
  let date = document.querySelector("div.selfBookingDialog input");
  let today = new Date(date.value);
  let startDate = today.toJSON().slice(0, 10) + " 04:00:00";
  let tomorrow = new Date(today.setDate(today.getDate() + 1));
  let endDate = tomorrow.toJSON().slice(0, 10) + " 04:00:00";

  let data = {
    appointmentTypeExternalID: state.swim.externalAppointmentTypeID,
    levelID: state.swim.eventLevelID,
    externalApplicationID: 4069,
    userID: 18224732,
    trainerExternalID: null,
    startTimeUtc: startDate,
    endTimeUtc: endDate,
  };

  // send requests to fetch available times
  let promises = state.swim.trainers.map((trainer) => {
    data.trainerExternalID = trainer.externalTrainerID;
    return getAvailableTimes(trainer.name, data);
  });

  let res = await Promise.all(promises);

  // Format results and sort by time
  res = Object.fromEntries(res);
  let transposed = {};
  for (const [lane, times] of Object.entries(res)) {
    times.forEach((time) => {
      if (!transposed[time]) {
        transposed[time] = [];
      }
      transposed[time].push(lane);
    });
  }
  res = {};
  Object.keys(transposed)
    .sort((a, b) => {
      return new Date(`2024/01/01 ${a}`) - new Date(`2024/01/01 ${b}`);
    })
    .forEach((key) => {
      res[key] = transposed[key];
    });

  // show results and add refresh button
  let swimTimes = document.getElementById("swimTimes");
  if (swimTimes === null) {
    let info = document.createElement("div");
    info.style.padding = "0 2em";
    let times = JSON.stringify(res, null, 2);
    info.innerHTML = `
      <button class="ant-btn" onclick="handleSwim()">Refresh</button>
      <pre id="swimTimes">${times}</pre>
    `;
    document
      .querySelector("div.modal-footer")
      .insertAdjacentElement("afterend", info);
    swimTimes = document.getElementById("swimTimes");
  }
  swimTimes.innerText = JSON.stringify(res, null, 2);
}

function runScript() {
  // patch the XHR request to get the swim lane reservation
  let oldXHROpen = window.XMLHttpRequest.prototype.open;
  window.XMLHttpRequest.prototype.open = function (
    method,
    url,
    async,
    user,
    password
  ) {
    this.addEventListener("load", function () {
      if ("appointments" in this.response) {
        let swim = this.response.appointments.find(
          (a) => a.name === "Swim Lane Reservation"
        );
        state.swim = swim;
        handleSwim();
      }
    });
    return oldXHROpen.apply(this, arguments);
  };

  // patch the XHR request to get headers
  let oldXHRsetRequestHeader = window.XMLHttpRequest.prototype.setRequestHeader;
  window.XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
    if (header === "Authorization") {
      state.authorization = value;
    }
    return oldXHRsetRequestHeader.apply(this, arguments);
  };

  // make handleSwim available globally
  window.handleSwim = handleSwim;
}

window.addEventListener("load", runScriptWhenReady);
