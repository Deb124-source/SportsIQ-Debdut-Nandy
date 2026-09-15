const API_BASE = "https://sportsiq-backend-i3sr.onrender.com/api";

let charts = {};
let currentPlayer = null;


/* =========================================================
   BASIC HELPERS
========================================================= */

function $(id) {
    return document.getElementById(id);
}


function escapeHTML(value) {
    if (value === null || value === undefined) return "";

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function setText(id, value, fallback = "—") {
    const element = $(id);

    if (!element) {
        console.warn(`Element not found: #${id}`);
        return;
    }

    if (value === null || value === undefined || value === "") {
        element.textContent = fallback;
    } else {
        element.textContent = value;
    }
}


/* =========================================================
   API
========================================================= */

async function apiFetch(endpoint, options = {}) {

    const url = `${API_BASE}${endpoint}`;

    console.log("SportsIQ API REQUEST:", url);

    try {

        const response = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });

        console.log(
            "SportsIQ API RESPONSE:",
            endpoint,
            response.status
        );

        const text = await response.text();

        let data;

        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            data = {
                raw: text
            };
        }

        if (!response.ok) {

            console.error(
                "SportsIQ API ERROR:",
                endpoint,
                data
            );

            throw new Error(
                data.detail ||
                data.message ||
                `API request failed (${response.status})`
            );
        }

        return data;

    } catch (error) {

        console.error(
            "SportsIQ FETCH FAILED:",
            endpoint,
            error
        );

        throw error;
    }
}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

    const buttons = document.querySelectorAll(
        ".nav-item[data-section], .feature-card[data-section]"
    );

    console.log(
        "SportsIQ navigation buttons:",
        buttons.length
    );

    buttons.forEach(button => {

        button.addEventListener("click", () => {

            const section = button.dataset.section;

            console.log(
                "SportsIQ navigation:",
                section
            );

            showSection(section);
        });
    });
}


function showSection(sectionName) {

    console.log(
        "SportsIQ SHOW SECTION:",
        sectionName
    );

    const sections = document.querySelectorAll(
        ".page-section"
    );

    sections.forEach(section => {
        section.classList.remove("active");
        section.style.display = "none";
    });


    const target = $(`${sectionName}-section`);

    if (!target) {

        console.error(
            `Section not found: ${sectionName}-section`
        );

        return;
    }


    target.classList.add("active");
    target.style.display = "";


    document
        .querySelectorAll(".nav-item[data-section]")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.section === sectionName
            );
        });


    const titles = {
        dashboard: "Dashboard",
        players: "Player Intelligence",
        matches: "Match Intelligence",
        teams: "Teams",
        venues: "Venues",
        ai: "AI Analyst"
    };


    setText(
        "page-title",
        titles[sectionName] || "SportsIQ"
    );


    /* Load section data */

    if (sectionName === "players") {
        loadPlayers();
    }

    if (sectionName === "matches") {
        loadMatches();
        loadSeasons();
    }

    if (sectionName === "teams") {
        loadTeams();
    }

    if (sectionName === "venues") {
        loadVenues();
    }
}


/* =========================================================
   HEALTH
========================================================= */

async function loadHealth() {

    try {

        const data = await apiFetch("/health");

        console.log(
            "SportsIQ HEALTH:",
            data
        );

    } catch (error) {

        console.error(
            "Health check failed:",
            error
        );
    }
}


/* =========================================================
   OVERVIEW
========================================================= */

async function loadOverview() {

    try {

        const data = await apiFetch("/overview");

        console.log(
            "SportsIQ OVERVIEW DATA:",
            data
        );


        /*
         * Support both:
         *
         * {
         *   matches: ...,
         *   deliveries: ...,
         *   players: ...,
         *   teams: ...
         * }
         *
         * and:
         *
         * {
         *   overview: {
         *      matches: ...
         *   }
         * }
         */

        const overview =
            data.overview ||
            data.data ||
            data;


        setText(
            "kpi-matches",
            overview.matches ??
            overview.total_matches ??
            overview.match_count
        );


        setText(
            "kpi-deliveries",
            overview.deliveries ??
            overview.total_deliveries ??
            overview.delivery_count
        );


        setText(
            "kpi-players",
            overview.players ??
            overview.total_players ??
            overview.player_count
        );


        setText(
            "kpi-teams",
            overview.teams ??
            overview.total_teams ??
            overview.team_count
        );

    } catch (error) {

        console.error(
            "Overview loading failed:",
            error
        );

        setText("kpi-matches", "—");
        setText("kpi-deliveries", "—");
        setText("kpi-players", "—");
        setText("kpi-teams", "—");
    }
}


/* =========================================================
   PLAYERS
========================================================= */

async function loadPlayers() {

    const select = $("player-select");

    if (!select) return;


    try {

        const data = await apiFetch("/players");

        console.log(
            "SportsIQ PLAYERS:",
            data
        );


        let players =
            Array.isArray(data)
                ? data
                : (
                    data.players ||
                    data.data ||
                    []
                );


        players = players.map(player => {

            if (typeof player === "string") {
                return player;
            }

            return (
                player.name ||
                player.player_name ||
                player.Player ||
                player.player
            );
        }).filter(Boolean);


        players.sort();


        select.innerHTML = "";


        const defaultOption =
            document.createElement("option");

        defaultOption.value = "";
        defaultOption.textContent =
            "Select a player";

        select.appendChild(defaultOption);


        players.forEach(player => {

            const option =
                document.createElement("option");

            option.value = player;
            option.textContent = player;

            select.appendChild(option);
        });


        console.log(
            `Loaded ${players.length} players`
        );


        /* Matchup selectors */

        populatePlayerSelect(
            "matchup-batter",
            players,
            "Select batter"
        );

        populatePlayerSelect(
            "matchup-bowler",
            players,
            "Select bowler"
        );


    } catch (error) {

        console.error(
            "Players loading failed:",
            error
        );

        select.innerHTML =
            `<option value="">Unable to load players</option>`;
    }
}


function populatePlayerSelect(
    id,
    players,
    placeholder
) {

    const select = $(id);

    if (!select) return;

    select.innerHTML = "";

    const first =
        document.createElement("option");

    first.value = "";
    first.textContent = placeholder;

    select.appendChild(first);


    players.forEach(player => {

        const option =
            document.createElement("option");

        option.value = player;
        option.textContent = player;

        select.appendChild(option);
    });
}


/* =========================================================
   PLAYER ANALYSIS
========================================================= */

function setupPlayerControls() {

    const button = $("load-player-btn");

    if (button) {

        button.addEventListener(
            "click",
            loadSelectedPlayer
        );
    }


    const backButton =
        $("back-player-btn");

    if (backButton) {

        backButton.addEventListener(
            "click",
            () => {

                $("player-dashboard")
                    ?.classList.add("hidden");

                $("player-selector-view")
                    ?.classList.remove("hidden");
            }
        );
    }
}


async function loadSelectedPlayer() {

    const select = $("player-select");

    const player =
        select?.value;


    if (!player) {

        alert("Please select a player.");

        return;
    }


    await loadPlayer(player);
}


async function loadPlayer(player) {

    currentPlayer = player;


    $("player-selector-view")
        ?.classList.add("hidden");


    $("player-dashboard")
        ?.classList.add("hidden");


    $("player-loading")
        ?.classList.remove("hidden");


    $("player-error")
        ?.classList.add("hidden");


    try {

        const data =
            await apiFetch(
                `/player/${encodeURIComponent(player)}`
            );


        console.log(
            "PLAYER DETAIL:",
            data
        );


        renderPlayer(data);


        $("player-dashboard")
            ?.classList.remove("hidden");

    } catch (error) {

        console.error(
            "Player loading failed:",
            error
        );


        const errorBox =
            $("player-error");

        if (errorBox) {

            errorBox.textContent =
                error.message;

            errorBox.classList.remove("hidden");
        }

    } finally {

        $("player-loading")
            ?.classList.add("hidden");
    }
}


function renderPlayer(data) {

    const player =
        data.player ||
        data;


    setText(
        "player-name",
        player.name ||
        player.player_name ||
        currentPlayer
    );


    setText(
        "player-initial",
        (
            player.name ||
            player.player_name ||
            currentPlayer ||
            "P"
        ).charAt(0).toUpperCase()
    );


    setText(
        "player-runs",
        player.runs ??
        player.total_runs
    );


    setText(
        "player-average",
        player.average ??
        player.batting_average
    );


    setText(
        "player-strike-rate",
        player.strike_rate ??
        player.strikeRate
    );


    setText(
        "player-wickets",
        player.wickets ??
        player.total_wickets
    );


    setText(
        "player-economy",
        player.economy
    );


    setText(
        "player-matches",
        player.matches ??
        player.total_matches
    );
}


/* =========================================================
   MATCHES
========================================================= */

async function loadMatches() {

    const table =
        $("matches-table");

    if (!table) return;


    try {

        const data =
            await apiFetch("/matches");


        console.log(
            "SportsIQ MATCHES:",
            data
        );


        let matches =
            Array.isArray(data)
                ? data
                : (
                    data.matches ||
                    data.data ||
                    []
                );


        if (!matches.length) {

            table.innerHTML =
                `<tr>
                    <td colspan="7">
                        No matches found.
                    </td>
                </tr>`;

            return;
        }


        table.innerHTML = "";


        matches.forEach(match => {

            const row =
                document.createElement("tr");


            const id =
                match.id ??
                match.match_id ??
                "";


            row.innerHTML = `
                <td>${escapeHTML(
                    match.id ??
                    match.match_id ??
                    "—"
                )}</td>

                <td>${escapeHTML(
                    match.date ??
                    match.match_date ??
                    "—"
                )}</td>

                <td>${escapeHTML(
                    match.season ??
                    "—"
                )}</td>

                <td>${escapeHTML(
                    match.teams ??
                    match.team1 + " vs " + match.team2
                    || "—"
                )}</td>

                <td>${escapeHTML(
                    match.venue ??
                    "—"
                )}</td>

                <td>${escapeHTML(
                    match.winner ??
                    "—"
                )}</td>

                <td>
                    <button
                        class="small-button match-view-btn"
                        data-match-id="${escapeHTML(id)}"
                    >
                        View
                    </button>
                </td>
            `;


            table.appendChild(row);
        });


        document
            .querySelectorAll(".match-view-btn")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        loadMatch(
                            button.dataset.matchId
                        );
                    }
                );
            });


    } catch (error) {

        console.error(
            "Matches loading failed:",
            error
        );


        table.innerHTML =
            `<tr>
                <td colspan="7">
                    Failed to load matches.
                </td>
            </tr>`;
    }
}


/* =========================================================
   SEASONS
========================================================= */

async function loadSeasons() {

    const select =
        $("match-season-filter");

    if (!select) return;


    try {

        const data =
            await apiFetch("/seasons");


        const seasons =
            Array.isArray(data)
                ? data
                : (
                    data.seasons ||
                    data.data ||
                    []
                );


        seasons.forEach(season => {

            const option =
                document.createElement("option");

            option.value =
                typeof season === "object"
                    ? season.season
                    : season;

            option.textContent =
                typeof season === "object"
                    ? season.season
                    : season;

            select.appendChild(option);
        });


        select.addEventListener(
            "change",
            () => {

                loadMatches();
            }
        );


    } catch (error) {

        console.error(
            "Season loading failed:",
            error
        );
    }
}


/* =========================================================
   MATCH DETAIL / MODAL
========================================================= */

async function loadMatch(matchId) {

    if (!matchId) return;


    const modal =
        $("match-modal");

    const details =
        $("match-details");


    if (!modal || !details) return;


    modal.classList.remove("hidden");

    details.innerHTML =
        "Loading match...";


    try {

        const data =
            await apiFetch(
                `/match/${encodeURIComponent(matchId)}`
            );


        details.innerHTML =
            `<pre>${escapeHTML(
                JSON.stringify(data, null, 2)
            )}</pre>`;


    } catch (error) {

        details.textContent =
            error.message;
    }
}


function setupModal() {

    $("close-modal")
        ?.addEventListener(
            "click",
            () => {

                $("match-modal")
                    ?.classList.add("hidden");
            }
        );


    $("match-modal")
        ?.addEventListener(
            "click",
            event => {

                if (
                    event.target.id === "match-modal"
                ) {

                    event.currentTarget
                        .classList.add("hidden");
                }
            }
        );
}


/* =========================================================
   TEAMS
========================================================= */

async function loadTeams() {

    const container =
        $("teams-grid");

    if (!container) return;


    try {

        const data =
            await apiFetch("/teams");


        console.log(
            "SportsIQ TEAMS:",
            data
        );


        const teams =
            Array.isArray(data)
                ? data
                : (
                    data.teams ||
                    data.data ||
                    []
                );


        container.innerHTML = "";


        teams.forEach(team => {

            const name =
                typeof team === "string"
                    ? team
                    : (
                        team.name ||
                        team.team_name ||
                        team.team
                    );


            if (!name) return;


            const card =
                document.createElement("button");

            card.className =
                "feature-card";


            card.innerHTML = `
                <div class="feature-icon">◆</div>

                <div>
                    <h3>${escapeHTML(name)}</h3>

                    <p>
                        Explore team batting,
                        bowling and performance analytics.
                    </p>
                </div>

                <span class="feature-arrow">→</span>
            `;


            card.addEventListener(
                "click",
                () => loadTeam(name)
            );


            container.appendChild(card);
        });


    } catch (error) {

        console.error(
            "Teams loading failed:",
            error
        );


        container.innerHTML =
            `<div class="error-state">
                Failed to load teams.
            </div>`;
    }
}


async function loadTeam(teamName) {

    const detail =
        $("team-detail");

    const list =
        $("teams-view");


    if (!detail || !list) return;


    list.classList.add("hidden");

    detail.classList.remove("hidden");


    setText(
        "team-detail-name",
        teamName
    );


    const content =
        $("team-detail-content");


    if (!content) return;


    content.innerHTML =
        `<div class="loading-state">
            Loading team details...
        </div>`;


    try {

        const data =
            await apiFetch(
                `/team/${encodeURIComponent(teamName)}`
            );


        content.innerHTML =
            `<pre>${escapeHTML(
                JSON.stringify(data, null, 2)
            )}</pre>`;


    } catch (error) {

        content.innerHTML =
            `<div class="error-state">
                ${escapeHTML(error.message)}
            </div>`;
    }
}


function setupTeamControls() {

    $("close-team-detail")
        ?.addEventListener(
            "click",
            () => {

                $("team-detail")
                    ?.classList.add("hidden");

                $("teams-view")
                    ?.classList.remove("hidden");
            }
        );
}


/* =========================================================
   VENUES
========================================================= */

async function loadVenues() {

    const container =
        $("venues-grid");

    if (!container) return;


    try {

        const data =
            await apiFetch("/venues");


        console.log(
            "SportsIQ VENUES:",
            data
        );


        const venues =
            Array.isArray(data)
                ? data
                : (
                    data.venues ||
                    data.data ||
                    []
                );


        container.innerHTML = "";


        venues.forEach(venue => {

            const name =
                typeof venue === "string"
                    ? venue
                    : (
                        venue.name ||
                        venue.venue_name ||
                        venue.venue
                    );


            if (!name) return;


            const card =
                document.createElement("button");

            card.className =
                "feature-card";


            card.innerHTML = `
                <div class="feature-icon">◇</div>

                <div>
                    <h3>${escapeHTML(name)}</h3>

                    <p>
                        Explore venue scoring
                        and performance behaviour.
                    </p>
                </div>

                <span class="feature-arrow">→</span>
            `;


            card.addEventListener(
                "click",
                () => loadVenue(name)
            );


            container.appendChild(card);
        });


    } catch (error) {

        console.error(
            "Venues loading failed:",
            error
        );


        container.innerHTML =
            `<div class="error-state">
                Failed to load venues.
            </div>`;
    }
}


async function loadVenue(venueName) {

    const detail =
        $("venue-detail");

    const list =
        $("venues-view");


    if (!detail || !list) return;


    list.classList.add("hidden");

    detail.classList.remove("hidden");


    setText(
        "venue-detail-name",
        venueName
    );


    const content =
        $("venue-detail-content");


    if (!content) return;


    content.innerHTML =
        `<div class="loading-state">
            Loading venue details...
        </div>`;


    try {

        const data =
            await apiFetch(
                `/venue/${encodeURIComponent(venueName)}`
            );


        content.innerHTML =
            `<pre>${escapeHTML(
                JSON.stringify(data, null, 2)
            )}</pre>`;


    } catch (error) {

        content.innerHTML =
            `<div class="error-state">
                ${escapeHTML(error.message)}
            </div>`;
    }
}


function setupVenueControls() {

    $("close-venue-detail")
        ?.addEventListener(
            "click",
            () => {

                $("venue-detail")
                    ?.classList.add("hidden");

                $("venues-view")
                    ?.classList.remove("hidden");
            }
        );
}


/* =========================================================
   MATCHUP
========================================================= */

function setupMatchup() {

    $("matchup-btn")
        ?.addEventListener(
            "click",
            loadMatchup
        );
}


async function loadMatchup() {

    const batter =
        $("matchup-batter")?.value;

    const bowler =
        $("matchup-bowler")?.value;


    if (!batter || !bowler) {

        alert(
            "Please select both a batter and a bowler."
        );

        return;
    }


    const result =
        $("matchup-result");


    if (!result) return;


    result.innerHTML =
        `<div class="loading-state">
            Analysing matchup...
        </div>`;


    try {

        const data =
            await apiFetch(
                `/matchup?batter=${encodeURIComponent(batter)}&bowler=${encodeURIComponent(bowler)}`
            );


        console.log(
            "MATCHUP:",
            data
        );


        result.innerHTML =
            `<pre>${escapeHTML(
                JSON.stringify(data, null, 2)
            )}</pre>`;


    } catch (error) {

        result.innerHTML =
            `<div class="error-state">
                ${escapeHTML(error.message)}
            </div>`;
    }
}


/* =========================================================
   AI ANALYST
========================================================= */

function setupAI() {

    console.log(
        "SportsIQ: setting up AI"
    );


    const inputs = [
        "ai-question",
        "ai-question-global"
    ];


    const buttons = [
        "ai-send",
        "ai-send-global"
    ];


    inputs.forEach(id => {

        const input = $(id);

        if (!input) return;


        input.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter" &&
                    !event.shiftKey
                ) {

                    event.preventDefault();

                    sendAIQuestion(input);
                }
            }
        );
    });


    buttons.forEach(id => {

        const button = $(id);

        if (!button) return;


        button.addEventListener(
            "click",
            () => {

                const input =
                    id === "ai-send"
                        ? $("ai-question")
                        : $("ai-question-global");


                sendAIQuestion(input);
            }
        );
    });
}


async function sendAIQuestion(input) {

    if (!input) return;


    const question =
        input.value.trim();


    if (!question) return;


    const container =
        input.id === "ai-question"
            ? $("ai-messages")
            : $("ai-messages-global");


    appendAIMessage(
        container,
        "You",
        question,
        "user"
    );


    input.value = "";


    try {

        console.log(
            "SportsIQ AI QUESTION:",
            question
        );


        const data =
            await apiFetch(
                "/ai/chat",
                {
                    method: "POST",
                    body: JSON.stringify({
                        question: question
                    })
                }
            );


        console.log(
            "SportsIQ AI RESPONSE:",
            data
        );


        const answer =
            data.answer ||
            data.response ||
            data.message ||
            "No answer returned.";


        appendAIMessage(
            container,
            "SportsIQ AI",
            answer,
            "ai"
        );


    } catch (error) {

        console.error(
            "SportsIQ AI ERROR:",
            error
        );


        appendAIMessage(
            container,
            "SportsIQ AI",
            `Error: ${error.message}`,
            "ai"
        );
    }
}


function appendAIMessage(
    container,
    sender,
    message,
    type
) {

    if (!container) return;


    const div =
        document.createElement("div");


    div.className =
        `ai-message ${type || ""}`;


    const strong =
        document.createElement("strong");

    strong.textContent =
        sender;


    const p =
        document.createElement("p");

    p.textContent =
        message;


    div.appendChild(strong);
    div.appendChild(p);


    container.appendChild(div);


    container.scrollTop =
        container.scrollHeight;
}


/* =========================================================
   REFRESH
========================================================= */

function setupRefresh() {

    $("refresh-btn")
        ?.addEventListener(
            "click",
            async () => {

                const button =
                    $("refresh-btn");


                if (button) {

                    button.disabled = true;
                }


                try {

                    await Promise.allSettled([
                        loadHealth(),
                        loadOverview(),
                        loadPlayers(),
                        loadMatches(),
                        loadTeams(),
                        loadVenues()
                    ]);

                } finally {

                    if (button) {
                        button.disabled = false;
                    }
                }
            }
        );
}


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "================================"
        );

        console.log(
            "SportsIQ frontend starting..."
        );

        console.log(
            "================================"
        );


        try {

            setupNavigation();

            setupPlayerControls();

            setupAI();

            setupModal();

            setupRefresh();

            setupTeamControls();

            setupVenueControls();

            setupMatchup();


            showSection("dashboard");


            /*
             * Do NOT let one failed API request
             * stop the others.
             */

            await Promise.allSettled([

                loadHealth(),

                loadOverview(),

                loadPlayers(),

                loadMatches(),

                loadTeams(),

                loadVenues()

            ]);


            console.log(
                "SportsIQ frontend initialized."
            );


        } catch (error) {

            console.error(
                "SportsIQ INITIALIZATION ERROR:",
                error
            );
        }
    }
);
