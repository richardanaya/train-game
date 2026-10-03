(function () {
  "use strict";

  var DAY_LIMIT = 14;
  var LINE_GOAL = 6;
  var IRON_HAUL = 2;
  var COPPER_HAUL = 1;

  var ENGINES = [
    { id: "8", plate: "No. 8" },
    { id: "11", plate: "No. 11" }
  ];

  var JOB_LINE = {
    idle: "Assigned: idle",
    iron: "Assigned: iron mine to mill",
    copper: "Assigned: copper mine to mill",
    rail: "Assigned: mill to the line"
  };

  var state = initialState();

  function initialState() {
    return {
      day: 1,
      iron: 0,
      copper: 0,
      rail: 0,
      segments: 0,
      assignments: { "8": "idle", "11": "idle" },
      outcome: null,
      logTitle: "Morning",
      log: ["Both engines are in the yard. Assign each one, then run the day."]
    };
  }

  function daysLeft(current) {
    if (current.outcome === "loss") return 0;
    if (current.outcome === "win") return DAY_LIMIT - current.day;
    return DAY_LIMIT - current.day + 1;
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function outlook(current) {
    if (current.outcome) {
      return { kind: "closed", text: "Day closed." };
    }

    var iron = current.iron;
    var copper = current.copper;
    var rail = current.rail;
    var segments = current.segments;
    var notes = [];

    ENGINES.forEach(function (engine) {
      var job = current.assignments[engine.id];
      if (job === "iron") {
        iron += IRON_HAUL;
      } else if (job === "copper") {
        copper += COPPER_HAUL;
      } else if (job === "rail") {
        if (segments >= LINE_GOAL) {
          notes.push(engine.plate + " has no open grade left");
        } else if (rail >= 1) {
          rail -= 1;
          segments += 1;
        } else {
          notes.push(engine.plate + " will find no rail");
        }
      }
    });

    var rolls = iron >= 2 && copper >= 1;
    if (rolls) {
      iron -= 2;
      copper -= 1;
      rail += 1;
    }

    var text = rolls
      ? "By day’s end the mill rolls 1 rail. Floor: " + iron + " iron, " + copper + " copper, " + rail + " rail."
      : "By day’s end the mill does not roll. Floor: " + iron + " iron, " + copper + " copper, " + rail + " rail.";

    if (notes.length) {
      text += " " + notes.join(". ") + ".";
    }

    return { kind: rolls ? "roll" : "cold", text: text };
  }

  function assign(engineId, job) {
    if (state.outcome) return;
    if (!JOB_LINE[job]) return;
    state.assignments[engineId] = job;
    render(false);
  }

  function runDay() {
    if (state.outcome) return;

    var iron = state.iron;
    var copper = state.copper;
    var rail = state.rail;
    var segments = state.segments;
    var lines = [];

    ENGINES.forEach(function (engine) {
      var job = state.assignments[engine.id];
      if (job === "iron") {
        iron += IRON_HAUL;
        lines.push(engine.plate + " delivered " + IRON_HAUL + " iron to the mill. Iron: " + iron + ".");
      } else if (job === "copper") {
        copper += COPPER_HAUL;
        lines.push(engine.plate + " delivered " + COPPER_HAUL + " copper to the mill. Copper: " + copper + ".");
      } else if (job === "rail") {
        if (segments >= LINE_GOAL) {
          lines.push(engine.plate + " held the rail at the mill. The line already has " + LINE_GOAL + " segments.");
        } else if (rail >= 1) {
          rail -= 1;
          segments += 1;
          lines.push(engine.plate + " laid segment " + segments + " on the John Galt Line. Rail at the mill: " + rail + ".");
        } else {
          lines.push(engine.plate + " was sent for rail. The mill had none, so the engine did no work.");
        }
      } else {
        lines.push(engine.plate + " stood idle in the Taggart yard.");
      }
    });

    if (iron >= 2 && copper >= 1) {
      iron -= 2;
      copper -= 1;
      rail += 1;
      lines.push("The mill used 2 iron and 1 copper and rolled 1 rail. Rail at the mill: " + rail + ".");
    } else {
      lines.push("The mill did not roll. On hand: " + iron + " iron and " + copper + " copper. It needs 2 iron and 1 copper.");
    }

    var outcome = null;
    if (segments >= LINE_GOAL) outcome = "win";
    else if (state.day >= DAY_LIMIT) outcome = "loss";

    var finishedDay = state.day;
    state.iron = iron;
    state.copper = copper;
    state.rail = rail;
    state.segments = segments;
    state.outcome = outcome;
    state.logTitle = "Day " + finishedDay;
    state.log = lines;

    if (!outcome) {
      state.day = finishedDay + 1;
      state.assignments = { "8": "idle", "11": "idle" };
    }

    render(true);
    if (outcome) document.getElementById("again").focus();
  }

  function reset() {
    state = initialState();
    render(false);
    document.getElementById("run-day").focus();
  }

  function render(dayJustRan) {
    var left = daysLeft(state);
    document.getElementById("stat-day").textContent = pad(state.day);
    document.getElementById("stat-left").textContent = pad(left);
    document.getElementById("stat-laid").textContent = state.segments + "/" + LINE_GOAL;
    document.getElementById("iron").textContent = pad(state.iron);
    document.getElementById("copper").textContent = pad(state.copper);
    document.getElementById("rail").textContent = pad(state.rail);
    document.getElementById("line-count").textContent = state.segments + " of " + LINE_GOAL + " laid";
    document.getElementById("log-title").textContent = state.logTitle;

    var tally = document.getElementById("tally");
    tally.classList.toggle("win", state.outcome === "win");
    tally.classList.toggle("loss", state.outcome === "loss");

    document.querySelectorAll(".segment").forEach(function (segment) {
      var n = Number(segment.getAttribute("data-segment"));
      segment.classList.toggle("laid", n <= state.segments);
    });

    ENGINES.forEach(function (engine) {
      var job = state.assignments[engine.id];
      var card = document.getElementById("engine-" + engine.id);
      card.classList.remove("job-idle", "job-iron", "job-copper", "job-rail");
      card.classList.add("job-" + job);
      document.getElementById("assign-" + engine.id).textContent = JOB_LINE[job];
      document.querySelectorAll('[data-engine="' + engine.id + '"]').forEach(function (button) {
        var selected = button.getAttribute("data-job") === job;
        button.setAttribute("aria-pressed", selected ? "true" : "false");
        button.disabled = Boolean(state.outcome);
      });
    });

    document.getElementById("run-day").disabled = Boolean(state.outcome);

    var forecast = document.getElementById("forecast");
    var look = outlook(state);
    forecast.textContent = look.text;
    forecast.className = "forecast " + look.kind;

    var log = document.getElementById("log");
    log.replaceChildren();
    state.log.forEach(function (line) {
      var item = document.createElement("li");
      item.textContent = line;
      log.appendChild(item);
    });

    var logPanel = document.querySelector(".log-panel");
    logPanel.classList.remove("fresh");
    if (dayJustRan) {
      void logPanel.offsetWidth;
      logPanel.classList.add("fresh");
    }

    var result = document.getElementById("result");
    var resultText = document.getElementById("result-text");
    result.classList.remove("win", "loss");
    if (state.outcome === "win") {
      result.hidden = false;
      result.classList.add("win");
      resultText.textContent = "6 segments are laid on the John Galt Line. Finished on day " + state.day + ", with " + left + " day" + (left === 1 ? "" : "s") + " left.";
      document.title = "Line open · Taggart Dispatch";
    } else if (state.outcome === "loss") {
      result.hidden = false;
      result.classList.add("loss");
      resultText.textContent = "Day 14 ended with the line short: " + state.segments + " of 6 segments laid.";
      document.title = "Line short · Taggart Dispatch";
    } else {
      result.hidden = true;
      resultText.textContent = "";
      document.title = "Day " + state.day + " · Taggart Dispatch";
    }
  }

  document.querySelector(".yard").addEventListener("click", function (event) {
    var button = event.target.closest("button[data-job]");
    if (!button) return;
    assign(button.getAttribute("data-engine"), button.getAttribute("data-job"));
  });

  document.getElementById("run-day").addEventListener("click", runDay);
  document.getElementById("start-over").addEventListener("click", reset);
  document.getElementById("again").addEventListener("click", reset);

  render(false);
})();
