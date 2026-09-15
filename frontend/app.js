const API_BASE = "https://sportsiq-backend-i3sr.onrender.com/api";

let charts = {};
let currentPlayer = null;
let playersCache = [];


/* =========================================================
   HELPERS
========================================================= */

function $(id) {
    return document.getElementById(id);
}


function firstDefined(...values) {
    for (const value of values) {
        if (value !== undefined && value !== null && value !== "") {
            return value;
        }
    }

    return undefined;
}


function escapeHTML(value) {
    if (value === null || value === undefined) {
        return "";
    }

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
        console.warn(`SportsIQ: element #${id} not found`);
        return;
    }

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        element.textContent = fallback;
    } else {
        element.textContent = String(value);
    }
}


function show(id) {
    const element = $(id);

    if (element) {
        element.classList.remove("hidden");
    }
}


function hide(id) {
    const element = $(id);

    if (element) {
        element.classList.add("hidden");
    }
}


function normaliseList(data, keys = []) {
    if (Array.isArray(data)) {
        return data;
    }

    if (!data || typeof data !== "object") {
        return [];
    }

    for (const key of keys) {
        if (Array.isArray(data[key])) {
            return data[key];
        }
    }

    if (Array.isArray(data.data)) {
        return data.data;
    }

    return [];
}


function formatNumber(value) {
    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return "—";
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return String(value);
    }

    return number.toLocaleString("en-IN");
}


/* =========================================================
   API
========================================================= */

async function apiFetch(endpoint, options = {}) {

    const url = `${API_BASE}${endpoint}`;

    console.log("SportsIQ API REQUEST:", url);

    const fetchOptions = {
        ...options,
        headers: {
            ...(options.body
                ? {
                    "Content-Type": "application/json"
                }
                : {}),
            ...(options.headers || {})
        }
    };

    try {

        const response = await fetch(
            url,
            fetchOptions
        );

        const text = await response.text();

        let data = {};

        if (text) {

            try {
                data = JSON.parse(text);
            } catch (parseError) {

                console.warn(
                    "SportsIQ: response was not JSON",
                    parseError
                );

                data = {
                    raw: text
                };
            }
        }


        console.log(
            "SportsIQ API RESPONSE:",
            endpoint,
            response.status,
            data
        );


        if (!response.ok) {

            const message = firstDefined(
                data.detail,
                data.message,
                data.error,
                `API request failed (${response.status})`
            );

            throw new Error(
                String(message)
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

    const buttons =
        document.querySelectorAll(
            ".nav-item[data-section], .feature-card[data-section]"
        );


    console.log(
        "SportsIQ navigation buttons:",
        buttons.length
    );


    buttons.forEach(button => {

        button.addEventListener(
            "click",
            event => {

                event.preventDefault();

                showSection(
                    button.dataset.section
                );
            }
        );
    });
}


function showSection(sectionName) {

    console.log(
        "SportsIQ SHOW SECTION:",
        sectionName
    );


    const target =
        $(`${sectionName}-section`);


    if (!target) {

        console.error(
            `SportsIQ: section not found: ${sectionName}-section`
        );

        return;
    }


    document
        .querySelectorAll(".page-section")
        .forEach(section => {

            section.classList.remove("active");
            section.style.display = "none";
        });


    target.classList.add("active");
    target.style.display = "block";


    document
        .querySelectorAll(
            ".nav-item[data-section]"
        )
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.section === sectionName
            );
        });


    const titles = {

        dashboard:
            "Dashboard",

        players:
            "Player Intelligence",

        matches:
            "Match Intelligence",

        teams:
            "Teams",

        venues:
            "Venues",

        ai:
            "AI Analyst"
    };


    setText(
        "page-title",
        titles[sectionName] || "SportsIQ"
    );


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

        const data =
            await apiFetch("/health");


        console.log(
            "SportsIQ HEALTH:",
            data
        );


        return data;

    } catch (error) {

        console.error(
            "Health check failed:",
            error
        );

        return null;
    }
}


/* =========================================================
   OVERVIEW
========================================================= */

async function loadOverview() {

    try {

        const data =
            await apiFetch("/overview");


        console.log(
            "SportsIQ OVERVIEW DATA:",
            data
        );


        let overview = data;


        if (
            data &&
            typeof data.overview === "object" &&
            !Array.isArray(data.overview)
        ) {

            overview = data.overview;

        } else if (
            data &&
            typeof data.data === "object" &&
            !Array.isArray(data.data)
        ) {

            overview = data.data;
        }


        const matches =
            firstDefined(
                overview.matches,
                overview.total_matches,
                overview.match_count,
                overview.matches_count
            );


        const deliveries =
            firstDefined(
                overview.deliveries,
                overview.total_deliveries,
                overview.delivery_count,
                overview.deliveries_count
            );


        const players =
            firstDefined(
                overview.players,
                overview.total_players,
                overview.player_count,
                overview.players_count
            );


        const teams =
            firstDefined(
                overview.teams,
                overview.total_teams,
                overview.team_count,
                overview.teams_count
            );


        setText(
            "kpi-matches",
            formatNumber(matches)
        );


        setText(
            "kpi-deliveries",
            formatNumber(deliveries)
        );


        setText(
            "kpi-players",
            formatNumber(players)
        );


        setText(
            "kpi-teams",
            formatNumber(teams)
        );


        return data;

    } catch (error) {

        console.error(
            "Overview loading failed:",
            error
        );

        return null;
    }
}


/* =========================================================
   PLAYERS
========================================================= */

function playerNameFromItem(player) {

    if (typeof player === "string") {
        return player;
    }


    if (
        !player ||
        typeof player !== "object"
    ) {
        return null;
    }


    return firstDefined(
        player.name,
        player.player_name,
        player.Player,
        player.player
    );
}


async function loadPlayers() {

    const select =
        $("player-select");


    if (!select) {
        return;
    }


    try {

        const data =
            await apiFetch("/players");


        console.log(
            "SportsIQ PLAYERS:",
            data
        );


        const rawPlayers =
            normaliseList(
                data,
                ["players"]
            );


        playersCache =
            rawPlayers
                .map(playerNameFromItem)
                .filter(Boolean)
                .filter(
                    (value, index, array) =>
                        array.indexOf(value) === index
                )
                .sort(
                    (a, b) =>
                        a.localeCompare(b)
                );


        select.innerHTML = "";


        const defaultOption =
            document.createElement("option");


        defaultOption.value = "";
        defaultOption.textContent =
            "Select a player";


        select.appendChild(
            defaultOption
        );


        playersCache.forEach(player => {

            const option =
                document.createElement("option");


            option.value = player;
            option.textContent = player;


            select.appendChild(
                option
            );
        });


        populatePlayerSelect(
            "matchup-batter",
            playersCache,
            "Select batter"
        );


        populatePlayerSelect(
            "matchup-bowler",
            playersCache,
            "Select bowler"
        );


        console.log(
            `SportsIQ: loaded ${playersCache.length} players`
        );

    } catch (error) {

        console.error(
            "Players loading failed:",
            error
        );


        select.innerHTML = "";


        const option =
            document.createElement("option");


        option.value = "";
        option.textContent =
            "Unable to load players";


        select.appendChild(
            option
        );
    }
}


function populatePlayerSelect(
    id,
    players,
    placeholder
) {

    const select = $(id);


    if (!select) {
        return;
    }


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
   PLAYER CONTROLS
========================================================= */

function setupPlayerControls() {

    const loadButton =
        $("load-player-btn");


    if (loadButton) {

        loadButton.addEventListener(
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

                hide("player-dashboard");

                show("player-selector-view");

                hide("player-error");
            }
        );
    }
}


async function loadSelectedPlayer() {

    const player =
        $("player-select")?.value;


    if (!player) {

        alert(
            "Please select a player."
        );

        return;
    }


    await loadPlayer(player);
}


async function loadPlayer(player) {

    currentPlayer = player;


    hide("player-selector-view");
    hide("player-dashboard");
    hide("player-error");

    show("player-loading");


    try {

        const data =
            await apiFetch(
                `/player/${encodeURIComponent(player)}`
            );


        console.log(
            "SportsIQ PLAYER DETAIL:",
            data
        );


        renderPlayer(data);


        /*
         * Extra player endpoints are loaded
         * independently. A failure in one of them
         * must NOT break the main player page.
         */

        await loadPlayerExtras(
            player
        );


        show("player-dashboard");

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

            errorBox.classList.remove(
                "hidden"
            );
        }


        show("player-selector-view");

    } finally {

        hide("player-loading");
    }
}


function renderPlayer(data) {

    const player =
        data &&
        typeof data.player === "object"
            ? data.player
            : data || {};


    const name =
        firstDefined(
            player.name,
            player.player_name,
            player.Player,
            currentPlayer
        );


    setText(
        "player-name",
        name
    );


    setText(
        "player-initial",
        name
            ? String(name)
                .charAt(0)
                .toUpperCase()
            : "P"
    );


    setText(
        "player-runs",
        firstDefined(
            player.runs,
            player.total_runs
        )
    );


    setText(
        "player-average",
        firstDefined(
            player.average,
            player.batting_average
        )
    );


    setText(
        "player-strike-rate",
        firstDefined(
            player.strike_rate,
            player.strikeRate
        )
    );


    setText(
        "player-wickets",
        firstDefined(
            player.wickets,
            player.total_wickets
        )
    );


    setText(
        "player-economy",
        player.economy
    );


    setText(
        "player-matches",
        firstDefined(
            player.matches,
            player.total_matches
        )
    );


    setText(
        "player-dna",
        firstDefined(
            player.dna,
            player.archetype,
            "Player DNA"
        )
    );
}


/* =========================================================
   PLAYER EXTRA ANALYTICS
========================================================= */

async function loadPlayerExtras(player) {

    const results =
        await Promise.allSettled([

            apiFetch(
                `/player/${encodeURIComponent(player)}/dna`
            ),

            apiFetch(
                `/player/${encodeURIComponent(player)}/context-score`
            ),

            apiFetch(
                `/player/${encodeURIComponent(player)}/phases`
            ),

            apiFetch(
                `/player/${encodeURIComponent(player)}/form`
            ),

            apiFetch(
                `/player/${encodeURIComponent(player)}/season`
            ),

            apiFetch(
                `/player/${encodeURIComponent(player)}/similar`
            ),

            apiFetch(
                `/player/${encodeURIComponent(player)}/intelligence`
            )
        ]);


    const dna =
        results[0];

    const context =
        results[1];

    const phases =
        results[2];

    const form =
        results[3];

    const season =
        results[4];

    const similar =
        results[5];

    const intelligence =
        results[6];


    if (dna.status === "fulfilled") {
        renderDNA(dna.value);
    }


    if (context.status === "fulfilled") {
        renderContextScore(
            context.value
        );
    }


    if (phases.status === "fulfilled") {
        renderPhases(
            phases.value
        );
    }


    if (form.status === "fulfilled") {
        renderForm(
            form.value
        );
    }


    if (season.status === "fulfilled") {
        renderSeason(
            season.value
        );
    }


    if (similar.status === "fulfilled") {
        renderSimilar(
            similar.value
        );
    }


    if (
        intelligence.status ===
        "fulfilled"
    ) {

        renderIntelligence(
            intelligence.value
        );
    }
}


/* =========================================================
   PLAYER DNA
========================================================= */

function renderDNA(data) {

    let source = data;


    if (
        data &&
        typeof data.dna === "object"
    ) {

        source = data.dna;

    } else if (
        data &&
        typeof data.data === "object"
    ) {

        source = data.data;
    }


    source = source || {};


    setText(
        "dna-score",
        firstDefined(
            source.score,
            source.dna_score
        )
    );


    setText(
        "dna-archetype",
        firstDefined(
            source.archetype,
            source.type,
            source.label
        )
    );


    setText(
        "dna-description",
        firstDefined(
            source.description,
            source.summary,
            "Player statistical DNA."
        )
    );


    const tags =
        firstDefined(
            source.tags,
            source.labels,
            []
        );


    const container =
        $("dna-tags");


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (Array.isArray(tags)) {

        tags.forEach(tag => {

            const span =
                document.createElement("span");


            span.className = "tag";

            span.textContent =
                tag;


            container.appendChild(
                span
            );
        });
    }
}


/* =========================================================
   CONTEXT SCORE
========================================================= */

function renderContextScore(data) {

    let source = data;


    if (
        data &&
        typeof data.context_score === "object"
    ) {

        source =
            data.context_score;

    } else if (
        data &&
        typeof data.data === "object"
    ) {

        source =
            data.data;
    }


    source =
        source || {};


    const score =
        firstDefined(
            source.score,
            source.context_score,
            source.value
        );


    setText(
        "context-score",
        score
    );


    setText(
        "mini-context-score",
        score
    );


    const fill =
        $("context-score-fill");


    const numericScore =
        Number(score);


    if (
        fill &&
        Number.isFinite(numericScore)
    ) {

        const percentage =
            Math.max(
                0,
                Math.min(
                    100,
                    numericScore
                )
            );


        fill.style.width =
            `${percentage}%`;
    }


    setText(
        "context-summary",
        firstDefined(
            source.summary,
            source.description,
            source.interpretation,
            "Context score calculated by SportsIQ."
        )
    );
}


/* =========================================================
   PHASE ANALYSIS
========================================================= */

function renderPhases(data) {

    let source = data;


    if (
        data &&
        typeof data.phases === "object"
    ) {

        source =
            data.phases;

    } else if (
        data &&
        typeof data.data === "object"
    ) {

        source =
            data.data;
    }


    source =
        source || {};


    const powerplay =
        source.powerplay ||
        source.Powerplay ||
        {};


    const middle =
        source.middle ||
        source.middle_overs ||
        source.Middle ||
        {};


    const death =
        source.death ||
        source.death_overs ||
        source.Death ||
        {};


    renderPhaseCard(
        powerplay,
        "powerplay-runs",
        "powerplay-sr",
        "powerplay-fill"
    );


    renderPhaseCard(
        middle,
        "middle-runs",
        "middle-sr",
        "middle-fill"
    );


    renderPhaseCard(
        death,
        "death-runs",
        "death-sr",
        "death-fill"
    );
}


function renderPhaseCard(
    data,
    runsId,
    srId,
    fillId
) {

    data =
        data || {};


    const runs =
        firstDefined(
            data.runs,
            data.total_runs
        );


    const strikeRate =
        firstDefined(
            data.strike_rate,
            data.sr,
            data.strikeRate
        );


    setText(
        runsId,
        runs
    );


    setText(
        srId,
        strikeRate
    );


    const fill =
        $(fillId);


    const numericRuns =
        Number(runs);


    if (
        fill &&
        Number.isFinite(numericRuns)
    ) {

        const width =
            Math.max(
                0,
                Math.min(
                    100,
                    numericRuns / 5
                )
            );


        fill.style.width =
            `${width}%`;
    }
}


/* =========================================================
   RECENT FORM
========================================================= */

function renderForm(data) {

    const container =
        $("form-container");


    if (!container) {
        return;
    }


    const items =
        normaliseList(
            data,
            [
                "form",
                "matches",
                "recent_form"
            ]
        );


    container.innerHTML = "";


    if (!items.length) {

        container.innerHTML =
            `<div class="loading-state">
                No recent form data available.
            </div>`;

        return;
    }


    items.forEach(item => {

        const card =
            document.createElement("div");


        card.className =
            "phase-card";


        const runs =
            firstDefined(
                item.runs,
                item.batter_runs,
                item.score
            );


        const date =
            firstDefined(
                item.date,
                item.match_date,
                item.season
            );


        const strikeRate =
            firstDefined(
                item.strike_rate,
                item.sr,
                "—"
            );


        card.innerHTML = `

            <div class="phase-top">

                <span>
                    ${escapeHTML(
                        date || "Match"
                    )}
                </span>

                <span>
                    ${escapeHTML(
                        strikeRate
                    )}
                </span>

            </div>

            <strong>
                ${escapeHTML(
                    runs ?? "—"
                )}
            </strong>

            <small>
                Runs
            </small>
        `;


        container.appendChild(
            card
        );
    });
}


/* =========================================================
   SEASON ANALYSIS
========================================================= */

function renderSeason(data) {

    const tbody =
        $("season-table");


    if (!tbody) {
        return;
    }


    const seasons =
        normaliseList(
            data,
            [
                "season",
                "seasons",
                "data"
            ]
        );


    tbody.innerHTML = "";


    if (!seasons.length) {

        tbody.innerHTML = `

            <tr>

                <td colspan="7">
                    No season statistics available.
                </td>

            </tr>
        `;

        return;
    }


    seasons.forEach(item => {

        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>
                ${escapeHTML(
                    firstDefined(
                        item.season,
                        "—"
                    )
                )}
            </td>

            <td>
                ${escapeHTML(
                    firstDefined(
                        item.matches,
                        item.total_matches,
                        "—"
                    )
                )}
            </td>

            <td>
                ${escapeHTML(
                    firstDefined(
                        item.runs,
                        item.total_runs,
                        "—"
                    )
                )}
            </td>

            <td>
                ${escapeHTML(
                    firstDefined(
                        item.average,
                        item.batting_average,
                        "—"
                    )
                )}
            </td>

            <td>
                ${escapeHTML(
                    firstDefined(
                        item.strike_rate,
                        item.strikeRate,
                        "—"
                    )
                )}
            </td>

            <td>
                ${escapeHTML(
                    firstDefined(
                        item.wickets,
                        item.total_wickets,
                        "—"
                    )
                )}
            </td>

            <td>
                ${escapeHTML(
                    firstDefined(
                        item.economy,
                        "—"
                    )
                )}
            </td>
        `;


        tbody.appendChild(
            row
        );
    });
}


/* =========================================================
   SIMILAR PLAYERS
========================================================= */

function renderSimilar(data) {

    const container =
        $("similar-players");


    if (!container) {
        return;
    }


    const items =
        normaliseList(
            data,
            [
                "similar",
                "players",
                "data"
            ]
        );


    container.innerHTML = "";


    if (!items.length) {

        container.innerHTML =
            `<div class="loading-state">
                No similar players available.
            </div>`;

        return;
    }


    items.forEach(item => {

        const name =
            playerNameFromItem(item) ||
            "Unknown player";


        let score;


        if (
            item &&
            typeof item === "object"
        ) {

            score =
                firstDefined(
                    item.similarity,
                    item.score
                );
        }


        const card =
            document.createElement("div");


        card.className =
            "feature-card";


        card.innerHTML = `

            <div class="feature-icon">
                ◉
            </div>

            <div>

                <h3>
                    ${escapeHTML(name)}
                </h3>

                <p>
                    Similarity:
                    ${escapeHTML(
                        score ?? "—"
                    )}
                </p>

            </div>
        `;


        container.appendChild(
            card
        );
    });
}


/* =========================================================
   PLAYER INTELLIGENCE
========================================================= */

function renderIntelligence(data) {

    if (
        !data ||
        typeof data !== "object"
    ) {
        return;
    }


    const source =
        data.intelligence ||
        data.data ||
        data;


    const score =
        firstDefined(
            source.context_score,
            source.score
        );


    if (
        score !== undefined
    ) {

        setText(
            "context-score",
            score
        );


        setText(
            "mini-context-score",
            score
        );
    }
}


/* =========================================================
   MATCHES
========================================================= */

async function loadMatches() {

    const table =
        $("matches-table");


    if (!table) {
        return;
    }


    try {

        const data =
            await apiFetch(
                "/matches"
            );


        console.log(
            "SportsIQ MATCHES:",
            data
        );


        let matches =
            normaliseList(
                data,
                ["matches"]
            );


        const selectedSeason =
            $("match-season-filter")?.value;


        if (selectedSeason) {

            matches =
                matches.filter(match => {

                    const season =
                        firstDefined(
                            match.season,
                            match.year
                        );


                    return String(season) ===
                        String(selectedSeason);
                });
        }


        table.innerHTML = "";


        if (!matches.length) {

            table.innerHTML = `

                <tr>

                    <td colspan="7">
                        No matches found.
                    </td>

                </tr>
            `;

            return;
        }


        matches.forEach(match => {

            const row =
                document.createElement("tr");


            const id =
                firstDefined(
                    match.id,
                    match.match_id,
                    ""
                );


            const teams =
                firstDefined(
                    match.teams,
                    match.team_names,
                    (
                        match.team1 &&
                        match.team2
                    )
                        ? `${match.team1} vs ${match.team2}`
                        : undefined,
                    "—"
                );


            row.innerHTML = `

                <td>
                    ${escapeHTML(
                        firstDefined(
                            match.id,
                            match.match_id,
                            "—"
                        )
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        firstDefined(
                            match.date,
                            match.match_date,
                            "—"
                        )
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        firstDefined(
                            match.season,
                            "—"
                        )
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        teams
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        firstDefined(
                            match.venue,
                            "—"
                        )
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        firstDefined(
                            match.winner,
                            "—"
                        )
                    )}
                </td>

                <td>

                    <button
                        type="button"
                        class="small-button match-view-btn"
                        data-match-id="${escapeHTML(id)}"
                    >
                        View
                    </button>

                </td>
            `;


            table.appendChild(
                row
            );
        });


        table
            .querySelectorAll(
                ".match-view-btn"
            )
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


        table.innerHTML = `

            <tr>

                <td colspan="7">
                    Failed to load matches.
                </td>

            </tr>
        `;
    }
}


/* =========================================================
   SEASONS
========================================================= */

async function loadSeasons() {

    const select =
        $("match-season-filter");


    if (!select) {
        return;
    }


    try {

        const data =
            await apiFetch(
                "/seasons"
            );


        const seasons =
            normaliseList(
                data,
                ["seasons"]
            );


        const current =
            select.value;


        select.innerHTML =
            `<option value="">
                All Seasons
            </option>`;


        seasons.forEach(item => {

            const season =
                typeof item === "object"
                    ? firstDefined(
                        item.season,
                        item.year
                    )
                    : item;


            if (
                season === undefined ||
                season === null
            ) {
                return;
            }


            const option =
                document.createElement("option");


            option.value =
                season;


            option.textContent =
                season;


            select.appendChild(
                option
            );
        });


        if (current) {
            select.value = current;
        }


        if (
            !select.dataset.bound
        ) {

            select.addEventListener(
                "change",
                loadMatches
            );


            select.dataset.bound =
                "true";
        }


    } catch (error) {

        console.error(
            "Season loading failed:",
            error
        );
    }
}


/* =========================================================
   MATCH MODAL
========================================================= */

async function loadMatch(matchId) {

    if (!matchId) {
        return;
    }


    const modal =
        $("match-modal");


    const details =
        $("match-details");


    if (
        !modal ||
        !details
    ) {
        return;
    }


    modal.classList.remove(
        "hidden"
    );


    details.textContent =
        "Loading match...";


    try {

        const data =
            await apiFetch(
                `/match/${encodeURIComponent(matchId)}`
            );


        details.innerHTML = `

            <pre>
${escapeHTML(
    JSON.stringify(
        data,
        null,
        2
    )
)}
            </pre>
        `;


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
                    ?.classList.add(
                        "hidden"
                    );
            }
        );


    $("match-modal")
        ?.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    event.currentTarget
                ) {

                    event.currentTarget
                        .classList.add(
                            "hidden"
                        );
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


    if (!container) {
        return;
    }


    try {

        const data =
            await apiFetch(
                "/teams"
            );


        console.log(
            "SportsIQ TEAMS:",
            data
        );


        const teams =
            normaliseList(
                data,
                ["teams"]
            );


        container.innerHTML = "";


        if (!teams.length) {

            container.innerHTML =
                `<div class="loading-state">
                    No teams found.
                </div>`;

            return;
        }


        teams.forEach(team => {

            let name;


            if (
                typeof team ===
                "string"
            ) {

                name = team;

            } else {

                name =
                    firstDefined(
                        team.name,
                        team.team_name,
                        team.team
                    );
            }


            if (!name) {
                return;
            }


            const card =
                document.createElement(
                    "button"
                );


            card.type = "button";

            card.className =
                "feature-card";


            card.innerHTML = `

                <div class="feature-icon">
                    ◆
                </div>

                <div>

                    <h3>
                        ${escapeHTML(name)}
                    </h3>

                    <p>
                        Explore team batting,
                        bowling and performance analytics.
                    </p>

                </div>

                <span class="feature-arrow">
                    →
                </span>
            `;


            card.addEventListener(
                "click",
                () => loadTeam(name)
            );


            container.appendChild(
                card
            );
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


    const content =
        $("team-detail-content");


    if (
        !detail ||
        !list ||
        !content
    ) {
        return;
    }


    hide("teams-view");

    show("team-detail");


    setText(
        "team-detail-name",
        teamName
    );


    content.innerHTML =
        `<div class="loading-state">
            Loading team details...
        </div>`;


    try {

        const data =
            await apiFetch(
                `/team/${encodeURIComponent(teamName)}`
            );


        content.innerHTML = `

            <pre>
${escapeHTML(
    JSON.stringify(
        data,
        null,
        2
    )
)}
            </pre>
        `;


    } catch (error) {

        content.innerHTML =
            `<div class="error-state">
                ${escapeHTML(
                    error.message
                )}
            </div>`;
    }
}


function setupTeamControls() {

    $("close-team-detail")
        ?.addEventListener(
            "click",
            () => {

                hide(
                    "team-detail"
                );

                show(
                    "teams-view"
                );
            }
        );
}


/* =========================================================
   VENUES
========================================================= */

async function loadVenues() {

    const container =
        $("venues-grid");


    if (!container) {
        return;
    }


    try {

        const data =
            await apiFetch(
                "/venues"
            );


        console.log(
            "SportsIQ VENUES:",
            data
        );


        const venues =
            normaliseList(
                data,
                ["venues"]
            );


        container.innerHTML = "";


        if (!venues.length) {

            container.innerHTML =
                `<div class="loading-state">
                    No venues found.
                </div>`;

            return;
        }


        venues.forEach(venue => {

            let name;


            if (
                typeof venue ===
                "string"
            ) {

                name = venue;

            } else {

                name =
                    firstDefined(
                        venue.name,
                        venue.venue_name,
                        venue.venue
                    );
            }


            if (!name) {
                return;
            }


            const card =
                document.createElement(
                    "button"
                );


            card.type = "button";

            card.className =
                "feature-card";


            card.innerHTML = `

                <div class="feature-icon">
                    ◇
                </div>

                <div>

                    <h3>
                        ${escapeHTML(name)}
                    </h3>

                    <p>
                        Explore venue scoring
                        and performance behaviour.
                    </p>

                </div>

                <span class="feature-arrow">
                    →
                </span>
            `;


            card.addEventListener(
                "click",
                () => loadVenue(name)
            );


            container.appendChild(
                card
            );
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


    const content =
        $("venue-detail-content");


    if (
        !detail ||
        !list ||
        !content
    ) {
        return;
    }


    hide("venues-view");

    show("venue-detail");


    setText(
        "venue-detail-name",
        venueName
    );


    content.innerHTML =
        `<div class="loading-state">
            Loading venue details...
        </div>`;


    try {

        const data =
            await apiFetch(
                `/venue/${encodeURIComponent(venueName)}`
            );


        content.innerHTML = `

            <pre>
${escapeHTML(
    JSON.stringify(
        data,
        null,
        2
    )
)}
            </pre>
        `;


    } catch (error) {

        content.innerHTML =
            `<div class="error-state">
                ${escapeHTML(
                    error.message
                )}
            </div>`;
    }
}


function setupVenueControls() {

    $("close-venue-detail")
        ?.addEventListener(
            "click",
            () => {

                hide(
                    "venue-detail"
                );

                show(
                    "venues-view"
                );
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


    const result =
        $("matchup-result");


    if (
        !batter ||
        !bowler
    ) {

        alert(
            "Please select both a batter and a bowler."
        );

        return;
    }


    if (!result) {
        return;
    }


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
            "SportsIQ MATCHUP:",
            data
        );


        result.innerHTML = `

            <pre>
${escapeHTML(
    JSON.stringify(
        data,
        null,
        2
    )
)}
            </pre>
        `;


    } catch (error) {

        console.error(
            "Matchup failed:",
            error
        );


        result.innerHTML =
            `<div class="error-state">
                ${escapeHTML(
                    error.message
                )}
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


    const bindings = [

        {
            input: "ai-question",
            button: "ai-send"
        },

        {
            input: "ai-question-global",
            button: "ai-send-global"
        }
    ];


    bindings.forEach(
        ({ input, button }) => {

            const inputElement =
                $(input);


            const buttonElement =
                $(button);


            if (inputElement) {

                inputElement.addEventListener(
                    "keydown",
                    event => {

                        if (
                            event.key ===
                                "Enter" &&
                            !event.shiftKey
                        ) {

                            event.preventDefault();

                            sendAIQuestion(
                                inputElement
                            );
                        }
                    }
                );
            }


            if (buttonElement) {

                buttonElement.addEventListener(
                    "click",
                    () => {

                        sendAIQuestion(
                            inputElement
                        );
                    }
                );
            }
        }
    );
}


async function sendAIQuestion(input) {

    if (!input) {
        return;
    }


    const question =
        input.value.trim();


    if (!question) {
        return;
    }


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


    const button =
        input.id === "ai-question"
            ? $("ai-send")
            : $("ai-send-global");


    const originalText =
        button
            ? button.textContent
            : "Ask";


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Thinking...";
    }


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

                    body:
                        JSON.stringify({
                            question:
                                question
                        })
                }
            );


        console.log(
            "SportsIQ AI RESPONSE:",
            data
        );


        const answer =
            firstDefined(
                data.answer,
                data.response,
                data.message,
                "No answer returned."
            );


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


    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                originalText;
        }
    }
}


function appendAIMessage(
    container,
    sender,
    message,
    type
) {

    if (!container) {
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


/* =========================================================
   REFRESH
========================================================= */

function setupRefresh() {

    const button =
        $("refresh-btn");


    if (!button) {
        return;
    }


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


            showSection(
                "dashboard"
            );


            await Promise.allSettled([

                loadHealth(),

                loadOverview(),

                loadPlayers(),

                loadMatches(),

                loadTeams(),

                loadVenues()

            ]);


            console.log(
                "SportsIQ frontend initialized successfully."
            );


        } catch (error) {

            console.error(
                "SportsIQ INITIALIZATION ERROR:",
                error
            );
        }
    }
);
