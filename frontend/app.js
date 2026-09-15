/* ============================================================
   SportsIQ — Cricket Intelligence Frontend
   ============================================================ */

const API_BASE =
    "https://sportsiq-backend-i3sr.onrender.com/api";


/* ============================================================
   BASIC HELPERS
   ============================================================ */

const $ = (id) => document.getElementById(id);

function safe(value, fallback = "—") {
    if (
        value === null ||
        value === undefined ||
        value === "" ||
        (typeof value === "number" && !Number.isFinite(value))
    ) {
        return fallback;
    }

    return value;
}

function number(value, digits = 2) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "—";
    }

    const n = Number(value);

    if (!Number.isFinite(n)) {
        return "—";
    }

    return n.toFixed(digits);
}

function integer(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "—";
    }

    const n = Number(value);

    if (!Number.isFinite(n)) {
        return "—";
    }

    return Math.round(n).toLocaleString();
}

function percent(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "—";
    }

    const n = Number(value);

    if (!Number.isFinite(n)) {
        return "—";
    }

    return `${n.toFixed(2)}%`;
}

function encode(value) {
    return encodeURIComponent(String(value ?? ""));
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function setText(ids, value) {
    ids.forEach(id => {
        const element = $(id);

        if (element) {
            element.textContent = safe(value);
        }
    });
}

function setHTML(ids, html) {
    ids.forEach(id => {
        const element = $(id);

        if (element) {
            element.innerHTML = html;
        }
    });
}

function showError(ids, message) {
    ids.forEach(id => {
        const element = $(id);

        if (element) {
            element.textContent =
                message || "Unable to load data.";
        }
    });
}


/* ============================================================
   API FETCH
   ============================================================ */

async function apiFetch(endpoint, options = {}) {

    const url =
        `${API_BASE}${endpoint}`;

    console.log(
        "SportsIQ API REQUEST:",
        options.method || "GET",
        url
    );

    const controller =
        new AbortController();

    const timeout =
        setTimeout(() => {
            controller.abort();
        }, options.timeout || 90000);

    try {

        const response =
            await fetch(url, {
                method:
                    options.method || "GET",

                body:
                    options.body,

                signal:
                    controller.signal,

                headers: {
                    "Content-Type":
                        "application/json",

                    ...(options.headers || {})
                }
            });

        console.log(
            "SportsIQ API RESPONSE:",
            response.status,
            url
        );

        const text =
            await response.text();

        let data = {};

        try {
            data =
                text
                    ? JSON.parse(text)
                    : {};
        } catch {
            data = {
                raw: text
            };
        }

        if (!response.ok) {

            console.error(
                "SportsIQ API ERROR:",
                response.status,
                data
            );

            throw new Error(
                data?.detail ||
                data?.message ||
                data?.error ||
                `Server returned ${response.status}`
            );
        }

        return data;

    } catch (error) {

        console.error(
            "SportsIQ FETCH FAILED:",
            error
        );

        if (
            error.name === "AbortError"
        ) {
            throw new Error(
                "Request timed out. The Render server may be waking up."
            );
        }

        throw error;

    } finally {

        clearTimeout(timeout);

    }
}


/* ============================================================
   INITIALIZATION
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "SportsIQ frontend loaded."
        );

        console.log(
            "SportsIQ API:",
            API_BASE
        );

        setupNavigation();
        setupPlayerControls();
        setupAI();
        setupModal();
        setupRefresh();
        setupTeamControls();
        setupVenueControls();
        setupMatchup();

        showSection(
            "dashboard-section"
        );

        /*
         * Load independent dashboard data.
         * Promise.allSettled prevents one failed endpoint
         * from stopping the entire frontend.
         */

        await Promise.allSettled([
            loadHealth(),
            loadOverview(),
            loadPlayers(),
            loadMatches(),
            loadTeams(),
            loadVenues()
        ]);

    }
);


/* ============================================================
   NAVIGATION
   ============================================================ */

function setupNavigation() {

    const links =
        document.querySelectorAll(
            "[data-section], .nav-link, .sidebar-link"
        );

    links.forEach(link => {

        link.addEventListener(
            "click",
            event => {

                const target =
                    link.dataset.section ||
                    link.getAttribute(
                        "data-target"
                    ) ||
                    link.getAttribute(
                        "href"
                    );

                if (!target) {
                    return;
                }

                if (
                    target.startsWith("#")
                ) {

                    event.preventDefault();

                    showSection(
                        target.substring(1)
                    );

                }

            }
        );

    });

}

function showSection(sectionId) {

    const sections =
        document.querySelectorAll(
            "section[id], .page-section"
        );

    sections.forEach(section => {

        if (
            section.id === sectionId
        ) {

            section.style.display = "";

        } else {

            section.style.display = "none";

        }

    });

    const links =
        document.querySelectorAll(
            "[data-section], .nav-link, .sidebar-link"
        );

    links.forEach(link => {

        const target =
            link.dataset.section ||
            link.getAttribute(
                "data-target"
            ) ||
            link.getAttribute(
                "href"
            );

        link.classList.toggle(
            "active",
            target === sectionId ||
            target === `#${sectionId}`
        );

    });

}


/* ============================================================
   HEALTH
   ============================================================ */

async function loadHealth() {

    try {

        const data =
            await apiFetch(
                "/health"
            );

        console.log(
            "Health:",
            data
        );

        const status =
            data?.status ||
            data?.message ||
            "Online";

        setText(
            [
                "system-status",
                "engine-status",
                "health-status",
                "status-text"
            ],
            status
        );

    } catch (error) {

        console.error(
            "Health error:",
            error
        );

        setText(
            [
                "system-status",
                "engine-status",
                "health-status",
                "status-text"
            ],
            "Offline"
        );

    }

}


/* ============================================================
   OVERVIEW
   ============================================================ */

async function loadOverview() {

    try {

        const data =
            await apiFetch(
                "/overview"
            );

        console.log(
            "Overview:",
            data
        );

        const overview =
            data?.overview ||
            data?.data ||
            data;

        setText(
            [
                "matches-count",
                "total-matches",
                "matches"
            ],
            integer(
                overview?.matches ??
                overview?.total_matches
            )
        );

        setText(
            [
                "deliveries-count",
                "total-deliveries",
                "deliveries"
            ],
            integer(
                overview?.deliveries ??
                overview?.total_deliveries
            )
        );

        setText(
            [
                "players-count",
                "total-players",
                "players"
            ],
            integer(
                overview?.players ??
                overview?.total_players
            )
        );

        setText(
            [
                "teams-count",
                "total-teams",
                "teams"
            ],
            integer(
                overview?.teams ??
                overview?.total_teams
            )
        );

        setText(
            [
                "venues-count",
                "total-venues",
                "venues"
            ],
            integer(
                overview?.venues ??
                overview?.total_venues
            )
        );

        setText(
            [
                "seasons-count",
                "total-seasons",
                "seasons"
            ],
            integer(
                overview?.seasons ??
                overview?.total_seasons
            )
        );

    } catch (error) {

        console.error(
            "Overview error:",
            error
        );

        showError(
            [
                "dashboard-error",
                "overview-error"
            ],
            error.message
        );

    }

}


/* ============================================================
   PLAYER CONTROLS
   ============================================================ */

function setupPlayerControls() {

    const select =
        $("player-select");

    if (!select) {
        return;
    }

    select.addEventListener(
        "change",
        async event => {

            const player =
                event.target.value;

            if (!player) {
                return;
            }

            await loadPlayer(
                player
            );

        }
    );

}

async function loadPlayers() {

    try {

        const data =
            await apiFetch(
                "/players"
            );

        console.log(
            "Players:",
            data
        );

        const players =
            Array.isArray(data)
                ? data
                : data?.players ||
                  data?.data ||
                  [];

        populatePlayerSelect(
            players
        );

    } catch (error) {

        console.error(
            "Players error:",
            error
        );

    }

}

function populatePlayerSelect(players) {

    const select =
        $("player-select");

    if (!select) {
        return;
    }

    const current =
        select.value;

    select.innerHTML =
        `<option value="">Select Player</option>`;

    players.forEach(player => {

        const name =
            typeof player === "string"
                ? player
                : player?.name ||
                  player?.player ||
                  player?.batter;

        if (!name) {
            return;
        }

        const option =
            document.createElement(
                "option"
            );

        option.value =
            name;

        option.textContent =
            name;

        select.appendChild(
            option
        );

    });

    if (current) {
        select.value = current;
    }

}

async function loadPlayer(playerName) {

    try {

        const data =
            await apiFetch(
                `/player/${encode(playerName)}`
            );

        console.log(
            "Player:",
            data
        );

        renderPlayer(
            data
        );

        await loadPlayerIntelligence(
            playerName
        );

    } catch (error) {

        console.error(
            "Player error:",
            error
        );

        showError(
            ["player-error"],
            error.message
        );

    }

}

async function loadPlayerIntelligence(
    playerName
) {

    try {

        const data =
            await apiFetch(
                `/player/${encode(playerName)}/intelligence`
            );

        console.log(
            "Player intelligence:",
            data
        );

        renderPlayerIntelligence(
            data
        );

    } catch (error) {

        console.error(
            "Player intelligence error:",
            error
        );

    }

}

function renderPlayer(data) {

    const profile =
        data?.profile ||
        data?.data ||
        data;

    setText(
        [
            "player-name",
            "selected-player-name"
        ],
        profile?.name ||
        profile?.player ||
        "Player"
    );

    setText(
        [
            "player-runs",
            "runs-value"
        ],
        integer(
            profile?.runs ??
            profile?.total_runs
        )
    );

    setText(
        [
            "player-average",
            "average-value"
        ],
        number(
            profile?.average ??
            profile?.batting_average
        )
    );

    setText(
        [
            "player-strike-rate",
            "strike-rate-value"
        ],
        number(
            profile?.strike_rate
        )
    );

    setText(
        [
            "player-wickets",
            "wickets-value"
        ],
        integer(
            profile?.wickets ??
            profile?.total_wickets
        )
    );

    setText(
        [
            "player-economy",
            "economy-value"
        ],
        number(
            profile?.economy
        )
    );

    setText(
        [
            "player-matches",
            "matches-value"
        ],
        integer(
            profile?.matches ??
            profile?.total_matches
        )
    );

}

function renderPlayerIntelligence(
    data
) {

    const profile =
        data?.profile || {};

    const dna =
        data?.dna || {};

    const context =
        data?.context_score ??
        data?.context ??
        {};

    const contextValue =
        typeof context === "number"
            ? context
            : context?.score;

    setText(
        [
            "context-score",
            "player-context-score"
        ],
        number(contextValue)
    );

    setText(
        ["player-role"],
        profile?.role ||
        dna?.role
    );

    setText(
        ["player-archetype"],
        dna?.archetype ||
        profile?.archetype
    );

}


/* ============================================================
   TEAM CONTROLS
   ============================================================ */

function setupTeamControls() {

    const select =
        $("team-select");

    if (!select) {
        return;
    }

    select.addEventListener(
        "change",
        async event => {

            const team =
                event.target.value;

            if (!team) {
                return;
            }

            await loadTeam(
                team
            );

        }
    );

}

async function loadTeams() {

    try {

        const data =
            await apiFetch(
                "/teams"
            );

        console.log(
            "Teams:",
            data
        );

        const teams =
            Array.isArray(data)
                ? data
                : data?.teams ||
                  data?.data ||
                  [];

        populateTeamSelect(
            teams
        );

    } catch (error) {

        console.error(
            "Teams error:",
            error
        );

    }

}

function populateTeamSelect(teams) {

    const select =
        $("team-select");

    if (!select) {
        return;
    }

    select.innerHTML =
        `<option value="">Select Team</option>`;

    teams.forEach(team => {

        const name =
            typeof team === "string"
                ? team
                : team?.name ||
                  team?.team;

        if (!name) {
            return;
        }

        const option =
            document.createElement(
                "option"
            );

        option.value =
            name;

        option.textContent =
            name;

        select.appendChild(
            option
        );

    });

}

async function loadTeam(
    teamName
) {

    try {

        const data =
            await apiFetch(
                `/team/${encode(teamName)}`
            );

        console.log(
            "Team:",
            data
        );

        renderTeam(
            data
        );

    } catch (error) {

        console.error(
            "Team error:",
            error
        );

        showError(
            ["team-error"],
            error.message
        );

    }

}

function renderTeam(data) {

    const team =
        data?.team ||
        data?.data ||
        data;

    setText(
        [
            "team-name",
            "selected-team-name"
        ],
        team?.name ||
        team?.team ||
        "Team"
    );

    setText(
        [
            "team-matches",
            "team-matches-value"
        ],
        integer(
            team?.matches
        )
    );

    setText(
        [
            "team-wins",
            "team-wins-value"
        ],
        integer(
            team?.wins
        )
    );

    setText(
        [
            "team-losses",
            "team-losses-value"
        ],
        integer(
            team?.losses
        )
    );

    setText(
        [
            "team-win-rate",
            "team-win-rate-value"
        ],
        percent(
            team?.win_percentage ??
            team?.win_rate
        )
    );

    setText(
        [
            "team-runs",
            "team-runs-value"
        ],
        integer(
            team?.runs
        )
    );

    setText(
        [
            "team-wickets",
            "team-wickets-value"
        ],
        integer(
            team?.wickets
        )
    );

}


/* ============================================================
   VENUE CONTROLS
   ============================================================ */

function setupVenueControls() {

    const select =
        $("venue-select");

    if (!select) {
        return;
    }

    select.addEventListener(
        "change",
        async event => {

            const venue =
                event.target.value;

            if (!venue) {
                return;
            }

            await loadVenue(
                venue
            );

        }
    );

}

async function loadVenues() {

    try {

        const data =
            await apiFetch(
                "/venues"
            );

        console.log(
            "Venues:",
            data
        );

        const venues =
            Array.isArray(data)
                ? data
                : data?.venues ||
                  data?.data ||
                  [];

        populateVenueSelect(
            venues
        );

    } catch (error) {

        console.error(
            "Venues error:",
            error
        );

    }

}

function populateVenueSelect(
    venues
) {

    const select =
        $("venue-select");

    if (!select) {
        return;
    }

    select.innerHTML =
        `<option value="">Select Venue</option>`;

    venues.forEach(venue => {

        const name =
            typeof venue === "string"
                ? venue
                : venue?.name ||
                  venue?.venue;

        if (!name) {
            return;
        }

        const option =
            document.createElement(
                "option"
            );

        option.value =
            name;

        option.textContent =
            name;

        select.appendChild(
            option
        );

    });

}

async function loadVenue(
    venueName
) {

    try {

        const data =
            await apiFetch(
                `/venue/${encode(venueName)}`
            );

        console.log(
            "Venue:",
            data
        );

        renderVenue(
            data
        );

    } catch (error) {

        console.error(
            "Venue error:",
            error
        );

        showError(
            ["venue-error"],
            error.message
        );

    }

}

function renderVenue(data) {

    const venue =
        data?.venue ||
        data?.data ||
        data;

    setText(
        [
            "venue-name",
            "selected-venue-name"
        ],
        venue?.name ||
        venue?.venue ||
        "Venue"
    );

    setText(
        [
            "venue-matches",
            "venue-matches-value"
        ],
        integer(
            venue?.matches
        )
    );

    setText(
        [
            "venue-runs",
            "venue-runs-value"
        ],
        integer(
            venue?.runs
        )
    );

    setText(
        [
            "venue-average",
            "venue-average-value"
        ],
        number(
            venue?.average_runs
        )
    );

    setText(
        [
            "venue-run-rate",
            "venue-run-rate-value"
        ],
        number(
            venue?.run_rate
        )
    );

    setText(
        [
            "venue-boundaries",
            "venue-boundaries-value"
        ],
        integer(
            venue?.boundaries
        )
    );

    setText(
        [
            "venue-sixes",
            "venue-sixes-value"
        ],
        integer(
            venue?.sixes
        )
    );

}


/* ============================================================
   MATCHES
   ============================================================ */

async function loadMatches() {

    try {

        const data =
            await apiFetch(
                "/matches"
            );

        console.log(
            "Matches:",
            data
        );

        const matches =
            Array.isArray(data)
                ? data
                : data?.matches ||
                  data?.data ||
                  [];

        renderMatches(
            matches
        );

    } catch (error) {

        console.error(
            "Matches error:",
            error
        );

    }

}

function renderMatches(
    matches
) {

    const containers =
        [
            $("matches-list"),
            $("recent-matches"),
            $("match-list")
        ].filter(Boolean);

    if (!containers.length) {
        return;
    }

    const html =
        matches
            .slice(-20)
            .reverse()
            .map(match => {

                const id =
                    match?.id ??
                    match?.match_id ??
                    "—";

                let teams =
                    match?.name ||
                    match?.match ||
                    "";

                if (
                    match?.team1 &&
                    match?.team2
                ) {

                    teams =
                        `${match.team1} vs ${match.team2}`;

                }

                if (!teams) {
                    teams = "Match";
                }

                return `
                    <div class="match-item">

                        <strong>
                            ${escapeHTML(teams)}
                        </strong>

                        <span>
                            Match ${escapeHTML(id)}
                        </span>

                    </div>
                `;

            })
            .join("");

    containers.forEach(
        container => {

            container.innerHTML =
                html ||
                "<p>No matches available.</p>";

        }
    );

}


/* ============================================================
   MATCHUP
   ============================================================ */

function setupMatchup() {

    const button =
        $("matchup-btn") ||
        $("analyze-matchup") ||
        $("matchup-submit");

    if (!button) {
        return;
    }

    if (
        button.dataset.bound === "true"
    ) {
        return;
    }

    button.dataset.bound = "true";

    button.addEventListener(
        "click",
        analyzeMatchup
    );

}

async function analyzeMatchup() {

    const batter =
        getInputValue([
            "batter-select",
            "matchup-batter",
            "batter"
        ]);

    const bowler =
        getInputValue([
            "bowler-select",
            "matchup-bowler",
            "bowler"
        ]);

    if (
        !batter ||
        !bowler
    ) {

        showError(
            ["matchup-error"],
            "Select both a batter and a bowler."
        );

        return;
    }

    try {

        const data =
            await apiFetch(
                `/matchup?batter=${encode(batter)}&bowler=${encode(bowler)}`
            );

        console.log(
            "Matchup:",
            data
        );

        renderMatchup(
            data
        );

    } catch (error) {

        console.error(
            "Matchup error:",
            error
        );

        showError(
            ["matchup-error"],
            error.message
        );

    }

}

function renderMatchup(
    data
) {

    const matchup =
        data?.matchup ||
        data?.data ||
        data;

    setText(
        ["matchup-runs"],
        integer(
            matchup?.runs
        )
    );

    setText(
        ["matchup-dismissals"],
        integer(
            matchup?.dismissals ??
            matchup?.wickets
        )
    );

    setText(
        ["matchup-balls"],
        integer(
            matchup?.balls
        )
    );

    setText(
        ["matchup-strike-rate"],
        number(
            matchup?.strike_rate
        )
    );

}


/* ============================================================
   INPUT HELPER
   ============================================================ */

function getInputValue(
    ids
) {

    for (
        const id of ids
    ) {

        const element =
            $(id);

        if (
            element &&
            element.value
        ) {

            return element.value.trim();

        }

    }

    return "";
}


/* ============================================================
   AI ANALYST
   ============================================================ */

function setupAI() {

    console.log(
        "Initializing SportsIQ AI..."
    );

    /*
     * Support both possible HTML ID sets.
     */

    const configurations = [

        {
            input:
                "ai-question",

            button:
                "ai-send",

            messages:
                "ai-messages"
        },

        {
            input:
                "ai-question-global",

            button:
                "ai-send-global",

            messages:
                "ai-messages-global"
        }

    ];

    let found =
        false;

    configurations.forEach(
        config => {

            const input =
                $(config.input);

            const button =
                $(config.button);

            if (
                !input ||
                !button
            ) {
                return;
            }

            found =
                true;

            console.log(
                `AI interface found: #${config.input}`
            );

            if (
                button.dataset.aiBound ===
                "true"
            ) {
                return;
            }

            button.dataset.aiBound =
                "true";

            button.addEventListener(
                "click",
                async () => {

                    await sendAIQuestion(
                        config
                    );

                }
            );

            input.addEventListener(
                "keydown",
                async event => {

                    if (
                        event.key ===
                            "Enter" &&
                        !event.shiftKey
                    ) {

                        event.preventDefault();

                        await sendAIQuestion(
                            config
                        );

                    }

                }
            );

        }
    );

    if (!found) {

        console.error(
            "SportsIQ AI ERROR: No AI input/button found."
        );

    }

}


async function sendAIQuestion(
    config
) {

    const input =
        $(config.input);

    const button =
        $(config.button);

    const messages =
        $(config.messages);

    if (!input) {

        console.error(
            `Missing AI input: #${config.input}`
        );

        return;

    }

    if (!button) {

        console.error(
            `Missing AI button: #${config.button}`
        );

        return;

    }

    if (!messages) {

        console.error(
            `Missing AI messages: #${config.messages}`
        );

        return;

    }

    const question =
        input.value.trim();

    if (!question) {
        return;
    }

    console.log(
        "SportsIQ AI QUESTION:",
        question
    );


    /* --------------------------------------------
       USER MESSAGE
       -------------------------------------------- */

    appendAIMessage(
        config.messages,
        "You",
        question,
        "user"
    );

    input.value = "";


    /* --------------------------------------------
       BUTTON LOADING
       -------------------------------------------- */

    const originalText =
        button.textContent;

    button.disabled =
        true;

    button.textContent =
        "Thinking...";


    /* --------------------------------------------
       LOADING MESSAGE
       -------------------------------------------- */

    const loading =
        document.createElement(
            "div"
        );

    loading.className =
        "ai-message ai";

    loading.id =
        `sportsiq-ai-loading-${Date.now()}`;

    loading.innerHTML = `
        <strong>SportsIQ AI</strong>
        <p>Analyzing cricket data...</p>
    `;

    messages.appendChild(
        loading
    );

    messages.scrollTop =
        messages.scrollHeight;


    /* --------------------------------------------
       API REQUEST
       -------------------------------------------- */

    try {

        console.log(
            "SportsIQ AI → POST /ai/chat"
        );

        const data =
            await apiFetch(
                "/ai/chat",
                {
                    method:
                        "POST",

                    body:
                        JSON.stringify({
                            question:
                                question
                        }),

                    timeout:
                        90000
                }
            );

        console.log(
            "SportsIQ AI RESPONSE:",
            data
        );

        loading.remove();

        const answer =
            data?.answer ||
            data?.response ||
            data?.message ||
            "SportsIQ AI did not return an answer.";

        appendAIMessage(
            config.messages,
            "SportsIQ AI",
            answer,
            "ai"
        );

    } catch (error) {

        console.error(
            "SportsIQ AI ERROR:",
            error
        );

        loading.remove();

        appendAIMessage(
            config.messages,
            "SportsIQ AI",
            `Unable to process the request.\n\n${error.message}`,
            "ai error"
        );

    } finally {

        button.disabled =
            false;

        button.textContent =
            originalText;

        input.focus();

    }

}


function appendAIMessage(
    containerId,
    sender,
    message,
    type
) {

    const container =
        $(containerId);

    if (!container) {

        console.error(
            `AI message container not found: #${containerId}`
        );

        return;

    }

    const div =
        document.createElement(
            "div"
        );

    div.className =
        `ai-message ${type || ""}`;


    const strong =
        document.createElement(
            "strong"
        );

    strong.textContent =
        sender;


    const p =
        document.createElement(
            "p"
        );

    p.textContent =
        message;


    div.appendChild(
        strong
    );

    div.appendChild(
        p
    );

    container.appendChild(
        div
    );

    container.scrollTop =
        container.scrollHeight;

}


/* ============================================================
   REFRESH
   ============================================================ */

function setupRefresh() {

    const buttons =
        document.querySelectorAll(
            "#refresh-btn, .refresh-btn, [data-refresh]"
        );

    buttons.forEach(
        button => {

            if (
                button.dataset.refreshBound ===
                "true"
            ) {
                return;
            }

            button.dataset.refreshBound =
                "true";

            button.addEventListener(
                "click",
                async () => {

                    button.disabled =
                        true;

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

                        button.disabled =
                            false;

                    }

                }
            );

        }
    );

}


/* ============================================================
   MODAL
   ============================================================ */

function setupModal() {

    const closeButtons =
        document.querySelectorAll(
            ".modal-close, [data-modal-close]"
        );

    closeButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                closeModal
            );

        }
    );

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                closeModal();

            }

        }
    );

}

function closeModal() {

    document
        .querySelectorAll(
            ".modal"
        )
        .forEach(
            modal => {

                modal.classList.remove(
                    "active"
                );

                modal.style.display =
                    "none";

            }
        );

}


/* ============================================================
   FINAL DEBUG MESSAGE
   ============================================================ */

console.log(
    "SportsIQ app.js initialized."
);
