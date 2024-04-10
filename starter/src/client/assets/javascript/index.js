let store = {
  track_id: undefined,
  track_name: undefined,
  player_id: undefined,
  player_name: undefined,
  race_id: undefined,
};

document.addEventListener("DOMContentLoaded", function () {
  onPageLoad();
  setupClickHandlers();
});

async function onPageLoad() {
  try {
    getTracks().then((tracks) => {
      const html = renderTrackCards(tracks);
      renderAt("#tracks", html);
    });

    getRacers().then((racers) => {
      const html = renderRacerCars(racers);
      renderAt("#racers", html);
    });
  } catch (error) {
    console.log("onPageLoad error:", error.message);
  }
}

function setupClickHandlers() {
  document.addEventListener(
    "click",
    function (event) {
      const { target } = event;

      if (target.matches(".card.track")) {
        handleSelectTrack(target);
        store.track_id = target.id;
        store.track_name = target.innerHTML;
      }

      if (target.matches(".card.racer")) {
        handleSelectRacer(target);
        store.player_id = target.id;
        store.player_name = target.innerHTML;
      }

      if (target.matches("#submit-create-race")) {
        event.preventDefault();

        handleCreateRace();
      }

      if (target.matches("#gas-peddle")) {
        handleAccelerate();
      }

      console.log("Store updated :: ", store);
    },
    false
  );
}

async function delay(ms) {
  try {
    return await new Promise((resolve) => setTimeout(resolve, ms));
  } catch (error) {
    console.log("delay error:", error);
  }
}

async function handleCreateRace() {
  const player_id = store.player_id;
  const track_id = store.track_id;
  try {
    if (player_id && track_id) {
      const race = await createRace(player_id, track_id);
      store.race_id = parseInt(race.ID) - 1;

      renderAt("#race", renderRaceStartView(race.Track, race.Cars));

      await runCountdown();

      await startRace(store.race_id);

      await runRace(store.race_id);
    } else {
      alert(`Please select your track and your racer`);
    }
  } catch (error) {
    console.error(error);
  }
}

function runRace(raceID) {
  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      const raceResponse = await getRace(raceID);
      if (raceResponse.status === "in-progress") {
        renderAt("#leaderBoard", raceProgress(raceResponse.positions));
      } else if (raceResponse.status === "finished") {
        clearInterval(interval);
        renderAt("#race", resultsView(raceResponse.positions));
        resolve(raceResponse);
      }
    }, 500);
  });
}

async function runCountdown() {
  try {
    await delay(1000);
    let timer = 3;

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        document.getElementById("big-numbers").innerHTML = --timer;
        if (timer <= 0) {
          clearInterval(interval);
          resolve("done");
          return;
        }
      }, 1000);
    });
  } catch (error) {
    console.log(`runCountdown error:`, error.message);
  }
}

function handleSelectRacer(target) {
  console.log("selected a racer", target.id);

  const selected = document.querySelector("#racers .selected");
  if (selected) {
    selected.classList.remove("selected");
  }

  target.classList.add("selected");
}

function handleSelectTrack(target) {
  console.log("selected track", target.id);

  const selected = document.querySelector("#tracks .selected");
  if (selected) {
    selected.classList.remove("selected");
  }

  target.classList.add("selected");
}

async function handleAccelerate() {
  try {
    await accelerate(store.race_id);
  } catch (error) {
    console.log(`handleAccelerate error:`, error.message);
  }
}

function renderRacerCars(racers) {
  if (!racers.length) {
    return `
			<h4>Loading Racers...</4>
		`;
  }

  const results = racers.map(renderRacerCard).join("");

  return `
		<ul id="racers">
			${results}
		</ul>
	`;
}

function renderRacerCard(racer) {
  const { id, driver_name } = racer;

  return `<h4 class="card racer" id="${id}">${driver_name}</h3>`;
}

function renderTrackCards(tracks) {
  if (!tracks.length) {
    return `
			<h4>Loading Tracks...</4>
		`;
  }

  const results = tracks.map(renderTrackCard).join("");

  return `
		<ul id="tracks">
			${results}
		</ul>
	`;
}

function renderTrackCard(track) {
  const { id, name } = track;

  return `<h4 id="${id}" class="card track">${name}</h4>`;
}

function renderCountdown(count) {
  return `
		<h2>Race Starts In...</h2>
		<p id="big-numbers">${count}</p>
	`;
}

function renderRaceStartView(track) {
  return `
		<header>
			<h1>Race: ${track.name}</h1>
		</header>
		<main id="two-columns">
			<section id="leaderBoard">
				${renderCountdown(3)}
			</section>

			<section id="accelerate">
				<h2>Directions</h2>
				<p>Click the button as fast as you can to make your racer go faster!</p>
				<button id="gas-peddle">Click Me To Win!</button>
			</section>
		</main>
		<footer></footer>
	`;
}

function resultsView(positions) {
  userPlayer.driver_name += " (you)";
  let count = 1;

  const results = positions.map((p) => {
    return `
			<tr>
				<td>
					<h3>${count++} - ${p.driver_name}</h3>
				</td>
			</tr>
		`;
  });

  return `
		<header>
			<h1>Race Results</h1>
		</header>
		<main>
			<h3>Race Results</h3>
			<p>The race is done! Here are the final results:</p>
			${results.join("")}
			<a href="/race">Start a new race</a>
		</main>
	`;
}

function raceProgress(positions) {
  let userPlayer = positions.find((e) => e.id === parseInt(store.player_id));
  userPlayer.driver_name += " (you)";

  positions = positions.sort((a, b) => (a.segment > b.segment ? -1 : 1));
  let count = 1;

  const results = positions.map((p) => {
    return `
			<tr>
				<td>
					<h3>${count++} - ${p.driver_name}</h3>
				</td>
			</tr>
		`;
  });

  return `
		<table>
			${results.join("")}
		</table>
	`;
}

function renderAt(element, html) {
  const node = document.querySelector(element);

  node.innerHTML = html;
}

const SERVER = "http://localhost:3001";

function defaultFetchOpts() {
  return {
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": SERVER,
    },
  };
}

async function getTracks() {
  try {
    const response = await fetch(`${SERVER}/api/tracks`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.log(`getTracks error:`, error.message);
  }
}

async function getRacers() {
  try {
    const response = await fetch(`${SERVER}/api/cars`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.log(`getRacers error:`, error.message);
  }
}

function createRace(player_id, track_id) {
  player_id = parseInt(player_id);
  track_id = parseInt(track_id);
  const body = { player_id, track_id };

  return fetch(`${SERVER}/api/races`, {
    method: "POST",
    ...defaultFetchOpts(),
    dataType: "jsonp",
    body: JSON.stringify(body),
  })
    .then((res) => res.json())
    .catch((err) => console.log("Problem with createRace request::", err));
}

async function getRace(id) {
  try {
    const response = await fetch(`${SERVER}/api/races/${id}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.log(`getRace error:`, error.message);
  }
}

function startRace(id) {
  return fetch(`${SERVER}/api/races/${id}/start`, {
    method: "POST",
    ...defaultFetchOpts(),
  })
    .then((res) => res.json())
    .catch((err) => console.log("startRace err:", err));
}

async function accelerate(id) {
  return await fetch(`${SERVER}/api/races/${id}/accelerate`, {
    method: "POST",
    ...defaultFetchOpts(),
  }).catch((error) => {
    console.log(`accelerate error:`, error.message);
  });
}
