const API_BASE = "/api";

// ============================================================
// HELPERS
// ============================================================

const $ = (id) => document.getElementById(id);

function escapeHTML(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatNumber(value) {
    if (value === null || value === undefined || value === "") {
        return "—";
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
        return value;
    }

    return number.toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });
}

function formatDecimal(value) {
    if (value === null || value === undefined || value === "") {
        return "—";
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
        return value;
    }

    return number.toFixed(2);
}

function formatDate(value) {
    if (!value) {
        return "—";
    }

    try {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    } catch {
        return value;
    }
}

async function apiFetch(endpoint, options = {}) {
    const response = await fetch(API_BASE + endpoint, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    if (!response.ok) {
        let message = `API Error: ${response.status}`;

        try {
            const data = await response.json();

            if (data.detail) {
                message = data.detail;
            }
        } catch {}

        throw new Error(message);
    }

    return response.json();
}

function firstDefined(...values) {
    return values.find(
        value =>
            value !== undefined &&
            value !== null &&
            value !== ""
    );
}

// ============================================================
// GLOBAL DATA
// ============================================================

let players = [];
let teams = [];
let venues = [];
let allMatches = [];

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {

    setupNavigation();
    setupPlayerControls();
    setupAI();
    setupModal();
    setupRefresh();
    setupTeamControls();
    setupVenueControls();
    setupMatchup();

    // Make dashboard visible immediately.
    showSection("dashboard-section");

    await loadHealth();
    await loadOverview();
    await loadPlayers();
    await loadMatches();
    await loadTeams();
    await loadVenues();

});

// ============================================================
// NAVIGATION
// ============================================================

function setupNavigation() {

    const navItems =
        document.querySelectorAll("[data-section]");

    navItems.forEach(item => {

        item.addEventListener("click", event => {

            event.preventDefault();

            const target =
                item.dataset.section;

            if (target) {
                showSection(target);
            }

        });

    });

}

function showSection(sectionId) {

    if (!sectionId) {
        return;
    }

    // Remove active from every section.
    document
        .querySelectorAll(
            ".section, .page-section"
        )
        .forEach(section => {

            section.classList.remove("active");

        });

    // Remove active from every navigation item.
    document
        .querySelectorAll("[data-section]")
        .forEach(item => {

            item.classList.toggle(
                "active",
                item.dataset.section === sectionId
            );

        });

    // Find section.
    let section = $(sectionId);

    if (!section) {
        section = $(`${sectionId}-section`);
    }

    if (!section) {
        section = document.querySelector(
            `#${CSS.escape(sectionId)}`
        );
    }

    if (!section) {
        console.warn(
            "Section not found:",
            sectionId
        );
        return;
    }

    section.classList.add("active");

    const titles = {

        "dashboard-section":
            "Cricket Analytics Dashboard",

        "players-section":
            "Player Intelligence",

        "matches-section":
            "Match Intelligence",

        "teams-section":
            "Team Analysis",

        "venues-section":
            "Venue Analysis",

        "ai-section":
            "AI Cricket Analyst"

    };

    if ($("page-title")) {

        $("page-title").textContent =
            titles[sectionId] || "SportsIQ";

    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

// ============================================================
// HEALTH
// ============================================================

async function loadHealth() {

    try {

        const data =
            await apiFetch("/health");

        const status =
            document.querySelector(".api-status");

        if (status) {

            status.textContent =
                `API Online • ${formatNumber(
                    data.deliveries
                )} deliveries • ${formatNumber(
                    data.matches
                )} matches`;

        }

        if ($("kpi-matches")) {

            $("kpi-matches").textContent =
                formatNumber(data.matches);

        }

        if ($("kpi-deliveries")) {

            $("kpi-deliveries").textContent =
                formatNumber(data.deliveries);

        }

    } catch (error) {

        console.error(
            "Health error:",
            error
        );

        const status =
            document.querySelector(".api-status");

        if (status) {
            status.textContent =
                "API Offline";
        }

    }

}

// ============================================================
// OVERVIEW
// ============================================================

async function loadOverview() {

    try {

        const data =
            await apiFetch("/overview");

        const matches =
            firstDefined(
                data.matches,
                data.total_matches
            );

        const deliveries =
            firstDefined(
                data.deliveries,
                data.total_deliveries
            );

        const playersCount =
            firstDefined(
                data.players,
                data.total_players
            );

        const teamsCount =
            firstDefined(
                data.teams,
                data.total_teams
            );

        const venuesCount =
            firstDefined(
                data.venues,
                data.total_venues
            );

        if (
            $("kpi-matches") &&
            matches !== undefined
        ) {
            $("kpi-matches").textContent =
                formatNumber(matches);
        }

        if (
            $("kpi-deliveries") &&
            deliveries !== undefined
        ) {
            $("kpi-deliveries").textContent =
                formatNumber(deliveries);
        }

        if (
            $("kpi-players") &&
            playersCount !== undefined
        ) {
            $("kpi-players").textContent =
                formatNumber(playersCount);
        }

        if (
            $("kpi-teams") &&
            teamsCount !== undefined
        ) {
            $("kpi-teams").textContent =
                formatNumber(teamsCount);
        }

        if (
            $("kpi-venues") &&
            venuesCount !== undefined
        ) {
            $("kpi-venues").textContent =
                formatNumber(venuesCount);
        }

    } catch (error) {

        console.error(
            "Overview error:",
            error
        );

    }

}

// ============================================================
// PLAYERS
// ============================================================

async function loadPlayers() {

    try {

        const data =
            await apiFetch("/players");

        players =
            Array.isArray(data)
                ? data
                : (data.players || []);

        populatePlayerSelectors();

    } catch (error) {

        console.error(
            "Players error:",
            error
        );

    }

}

function getPlayerName(player) {

    if (typeof player === "string") {
        return player;
    }

    return (
        player.name ||
        player.player ||
        player.player_name ||
        player.batter ||
        player.bowler ||
        ""
    );
}

function populatePlayerSelectors() {

    const playerSelect =
        $("player-select");

    if (playerSelect) {

        playerSelect.innerHTML =
            `<option value="">Select player</option>`;

        players.forEach(player => {

            const name =
                getPlayerName(player);

            if (!name) {
                return;
            }

            const option =
                document.createElement("option");

            option.value = name;
            option.textContent = name;

            playerSelect.appendChild(option);

        });

    }

    populateMatchupPlayers();
}

// ============================================================
// PLAYER CONTROLS
// ============================================================

function setupPlayerControls() {

    $("load-player-btn")?.addEventListener(
        "click",
        () => {

            const player =
                $("player-select")?.value;

            if (player) {
                loadPlayer(player);
            }

        }
    );

    $("player-select")?.addEventListener(
        "change",
        event => {

            if (event.target.value) {

                loadPlayer(
                    event.target.value
                );

            }

        }
    );

}

async function loadPlayer(playerName) {

    showSection("players-section");

    $("player-loading")?.classList.remove(
        "hidden"
    );

    $("player-error")?.classList.add(
        "hidden"
    );

    $("player-dashboard")?.classList.add(
        "hidden"
    );

    try {

        const encoded =
            encodeURIComponent(playerName);

        let intelligence = {};

        // First try combined endpoint.
        try {

            intelligence =
                await apiFetch(
                    `/player/${encoded}/intelligence`
                );

        } catch {

            // Fallback to individual endpoints.
            intelligence = {};

            try {
                intelligence.profile =
                    await apiFetch(
                        `/player/${encoded}`
                    );
            } catch {}

            try {
                intelligence.dna =
                    await apiFetch(
                        `/player/${encoded}/dna`
                    );
            } catch {}

            try {
                intelligence.context =
                    await apiFetch(
                        `/player/${encoded}/context-score`
                    );
            } catch {}

            try {
                intelligence.phases =
                    await apiFetch(
                        `/player/${encoded}/phases`
                    );
            } catch {}

            try {
                intelligence.form =
                    await apiFetch(
                        `/player/${encoded}/form`
                    );
            } catch {}

            try {
                intelligence.similar =
                    await apiFetch(
                        `/player/${encoded}/similar`
                    );
            } catch {}

            try {
                intelligence.season =
                    await apiFetch(
                        `/player/${encoded}/season`
                    );
            } catch {}
        }

        renderPlayerIntelligence(
            playerName,
            intelligence
        );

        $("player-dashboard")?.classList.remove(
            "hidden"
        );

    } catch (error) {

        console.error(
            "Player error:",
            error
        );

        const errorBox =
            $("player-error");

        if (errorBox) {

            errorBox.textContent =
                error.message ||
                "Unable to load player.";

            errorBox.classList.remove(
                "hidden"
            );

        }

    } finally {

        $("player-loading")?.classList.add(
            "hidden"
        );

    }

}

// ============================================================
// PLAYER RENDERING
// ============================================================

function renderPlayerIntelligence(
    name,
    data
) {

    const profile =
        data.profile ||
        data.player ||
        data;

    const dna =
        data.dna ||
        data.player_dna ||
        {};

    const context =
        data.context ||
        data.context_score ||
        {};

    const phases =
        data.phases ||
        data.phase_stats ||
        {};

    const form =
        data.form ||
        data.recent_form ||
        [];

    const similar =
        data.similar ||
        data.similar_players ||
        [];

    const season =
        data.season ||
        data.season_stats ||
        [];

    renderProfile(
        name,
        profile
    );

    renderDNA(dna);

    renderContext(context);

    renderPhases(phases);

    renderForm(form);

    renderSeasonStats(season);

    renderSimilar(similar);
}

// ============================================================
// PROFILE
// ============================================================

function renderProfile(
    name,
    profile
) {

    if ($("player-name")) {
        $("player-name").textContent =
            name;
    }

    if ($("player-initial")) {
        $("player-initial").textContent =
            name.charAt(0).toUpperCase();
    }

    const runs =
        firstDefined(
            profile.runs,
            profile.total_runs,
            0
        );

    const average =
        firstDefined(
            profile.average,
            profile.batting_average
        );

    const strikeRate =
        firstDefined(
            profile.strike_rate,
            profile.strikeRate,
            profile.sr
        );

    const wickets =
        firstDefined(
            profile.wickets,
            profile.total_wickets,
            0
        );

    const economy =
        firstDefined(
            profile.economy,
            profile.economy_rate
        );

    const matches =
        firstDefined(
            profile.matches,
            profile.match_count,
            0
        );

    if ($("player-runs")) {
        $("player-runs").textContent =
            formatNumber(runs);
    }

    if ($("player-average")) {
        $("player-average").textContent =
            formatDecimal(average);
    }

    if ($("player-strike-rate")) {
        $("player-strike-rate").textContent =
            formatDecimal(strikeRate);
    }

    if ($("player-wickets")) {
        $("player-wickets").textContent =
            formatNumber(wickets);
    }

    if ($("player-economy")) {
        $("player-economy").textContent =
            formatDecimal(economy);
    }

    if ($("player-matches")) {
        $("player-matches").textContent =
            formatNumber(matches);
    }

    if (
        profile.archetype &&
        $("player-dna")
    ) {

        $("player-dna").textContent =
            profile.archetype;

    }

}

// ============================================================
// DNA
// ============================================================

function renderDNA(dna) {

    const score =
        firstDefined(
            dna.score,
            dna.dna_score,
            dna.context_score,
            0
        );

    if ($("dna-score")) {

        $("dna-score").textContent =
            Math.round(
                Number(score) || 0
            );

    }

    if ($("dna-archetype")) {

        $("dna-archetype").textContent =
            dna.archetype ||
            dna.type ||
            "Player";

    }

    if ($("dna-description")) {

        $("dna-description").textContent =
            dna.description ||
            "Performance profile generated from batting and bowling behaviour.";

    }

    const tags =
        dna.tags ||
        dna.features ||
        [];

    if ($("dna-tags")) {

        $("dna-tags").innerHTML =
            Array.isArray(tags)
                ? tags.map(tag =>
                    `<span class="tag">${escapeHTML(tag)}</span>`
                ).join("")
                : "";

    }

}

// ============================================================
// CONTEXT SCORE
// ============================================================

function renderContext(context) {

    const score =
        Number(
            firstDefined(
                context.score,
                context.context_score,
                0
            )
        );

    if ($("context-score")) {

        $("context-score").textContent =
            `${Math.round(score)}/100`;

    }

    if ($("mini-context-score")) {

        $("mini-context-score").textContent =
            Math.round(score);

    }

    if ($("context-score-fill")) {

        $("context-score-fill").style.width =
            `${Math.max(
                0,
                Math.min(100, score)
            )}%`;

    }

    if ($("context-summary")) {

        $("context-summary").textContent =
            context.summary ||
            context.description ||
            "Custom SportsIQ performance score based on multiple statistical dimensions.";

    }

}

// ============================================================
// PHASE ANALYSIS
// ============================================================

function renderPhases(phases) {

    let data = phases;

    if (Array.isArray(phases)) {

        data = {};

        phases.forEach(item => {

            const phase =
                String(
                    item.phase ||
                    item.name ||
                    ""
                ).toLowerCase();

            data[phase] = item;

        });

    }

    const powerplay =
        findPhase(
            data,
            ["powerplay"]
        );

    const middle =
        findPhase(
            data,
            ["middle", "middle overs"]
        );

    const death =
        findPhase(
            data,
            ["death"]
        );

    renderPhase(
        powerplay,
        "powerplay-sr",
        "powerplay-runs",
        "powerplay-fill"
    );

    renderPhase(
        middle,
        "middle-sr",
        "middle-runs",
        "middle-fill"
    );

    renderPhase(
        death,
        "death-sr",
        "death-runs",
        "death-fill"
    );

}

function findPhase(
    data,
    names
) {

    if (!data) {
        return {};
    }

    for (const name of names) {

        const lower =
            name.toLowerCase();

        if (data[lower]) {
            return data[lower];
        }

        if (data[name]) {
            return data[name];
        }

    }

    return {};
}

function renderPhase(
    phase,
    srId,
    runsId,
    fillId
) {

    const sr =
        firstDefined(
            phase.strike_rate,
            phase.sr,
            0
        );

    const runs =
        firstDefined(
            phase.runs,
            phase.total_runs,
            phase.batter_runs,
            0
        );

    if ($(srId)) {

        $(srId).textContent =
            formatDecimal(sr);

    }

    if ($(runsId)) {

        $(runsId).textContent =
            formatNumber(runs);

    }

    if ($(fillId)) {

        $(fillId).style.width =
            `${Math.min(
                100,
                Math.max(
                    0,
                    Number(sr) / 2
                )
            )}%`;

    }

}

// ============================================================
// FORM
// ============================================================

function renderForm(form) {

    let rows = form;

    if (form?.form) {
        rows = form.form;
    }

    if (form?.matches) {
        rows = form.matches;
    }

    if (!Array.isArray(rows)) {
        rows = [];
    }

    if (!$("form-container")) {
        return;
    }

    $("form-container").innerHTML =
        rows.slice(0, 10)
            .map((item, index) => {

                const runs =
                    firstDefined(
                        item.runs,
                        item.total_runs,
                        0
                    );

                const sr =
                    firstDefined(
                        item.strike_rate,
                        item.sr
                    );

                const opponent =
                    firstDefined(
                        item.opponent,
                        item.team,
                        item.batting_team,
                        "Match"
                    );

                const season =
                    item.season || "";

                return `
                    <div class="form-card">

                        <span>
                            ${escapeHTML(
                                season ||
                                `Match ${index + 1}`
                            )}
                        </span>

                        <strong>
                            ${formatNumber(runs)}
                        </strong>

                        <small>
                            SR ${formatDecimal(sr)}
                        </small>

                        <small>
                            ${escapeHTML(opponent)}
                        </small>

                    </div>
                `;

            })
            .join("");

    if (!rows.length) {

        $("form-container").innerHTML =
            `<p>No recent form data available.</p>`;

    }

}

// ============================================================
// SEASON STATS
// ============================================================

function renderSeasonStats(season) {

    let rows = season;

    if (season?.seasons) {
        rows = season.seasons;
    }

    if (!Array.isArray(rows)) {
        rows = [];
    }

    if (!$("season-table")) {
        return;
    }

    $("season-table").innerHTML =
        rows.map(item => {

            return `
                <tr>

                    <td>
                        ${escapeHTML(
                            item.season ?? "—"
                        )}
                    </td>

                    <td>
                        ${formatNumber(
                            item.matches
                        )}
                    </td>

                    <td>
                        ${formatNumber(
                            firstDefined(
                                item.runs,
                                item.total_runs
                            )
                        )}
                    </td>

                    <td>
                        ${formatDecimal(
                            item.average
                        )}
                    </td>

                    <td>
                        ${formatDecimal(
                            firstDefined(
                                item.strike_rate,
                                item.sr
                            )
                        )}
                    </td>

                    <td>
                        ${formatNumber(
                            item.wickets
                        )}
                    </td>

                    <td>
                        ${formatDecimal(
                            item.economy
                        )}
                    </td>

                </tr>
            `;

        }).join("");

}

// ============================================================
// SIMILAR PLAYERS
// ============================================================

function renderSimilar(similar) {

    let rows = similar;

    if (similar?.players) {
        rows = similar.players;
    }

    if (!Array.isArray(rows)) {
        rows = [];
    }

    if (!$("similar-players")) {
        return;
    }

    $("similar-players").innerHTML =
        rows.slice(0, 8)
            .map(item => {

                const name =
                    item.name ||
                    item.player ||
                    item.player_name ||
                    "Player";

                const similarity =
                    firstDefined(
                        item.similarity,
                        item.score,
                        item.similarity_score
                    );

                return `
                    <div class="feature-card">

                        <h3>
                            ${escapeHTML(name)}
                        </h3>

                        <p>
                            Similarity:
                            <strong>
                                ${
                                    similarity !== undefined
                                        ? formatDecimal(similarity)
                                        : "—"
                                }
                            </strong>
                        </p>

                        <button
                            class="secondary-button similar-player-btn"
                            data-player="${escapeHTML(name)}">

                            Analyze

                        </button>

                    </div>
                `;

            })
            .join("");

    document
        .querySelectorAll(".similar-player-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const name =
                        button.dataset.player;

                    if ($("player-select")) {

                        $("player-select").value =
                            name;

                    }

                    showSection(
                        "players-section"
                    );

                    loadPlayer(name);

                }
            );

        });

    if (!rows.length) {

        $("similar-players").innerHTML =
            `<p>No similar player data available.</p>`;

    }

}

// ============================================================
// MATCHES
// ============================================================

async function loadMatches() {

    try {

        const data =
            await apiFetch("/matches");

        allMatches =
            Array.isArray(data)
                ? data
                : (data.matches || []);

        populateSeasonFilter();

        renderMatches(allMatches);

    } catch (error) {

        console.error(
            "Matches error:",
            error
        );

        if ($("matches-table")) {

            $("matches-table").innerHTML = `
                <tr>
                    <td colspan="7">
                        Unable to load matches.
                    </td>
                </tr>
            `;

        }

    }

}

function populateSeasonFilter() {

    const select =
        $("match-season-filter");

    if (!select) {
        return;
    }

    const seasons =
        [
            ...new Set(
                allMatches
                    .map(match => match.season)
                    .filter(
                        value =>
                            value !== null &&
                            value !== undefined &&
                            value !== ""
                    )
            )
        ]
        .sort(
            (a, b) =>
                Number(b) - Number(a)
        );

    select.innerHTML =
        `<option value="">All Seasons</option>`;

    seasons.forEach(season => {

        const option =
            document.createElement("option");

        option.value = season;
        option.textContent = season;

        select.appendChild(option);

    });

    select.onchange = () => {

        const value =
            select.value;

        if (!value) {

            renderMatches(
                allMatches
            );

            return;

        }

        renderMatches(
            allMatches.filter(
                match =>
                    String(match.season) ===
                    String(value)
            )
        );

    };

}

function renderMatches(matches) {

    const tbody =
        $("matches-table");

    if (!tbody) {
        return;
    }

    if (!matches.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    No matches found.
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        matches
            .slice(0, 100)
            .map(match => {

                const matchId =
                    firstDefined(
                        match.match_id,
                        match.id
                    );

                const teamsText =
                    match.team_1 &&
                    match.team_2
                        ? `${match.team_1} vs ${match.team_2}`
                        : match.teams ||
                          "—";

                let result = "—";

                if (
                    Number(match.win_by_runs) > 0
                ) {

                    result =
                        `Won by ${match.win_by_runs} runs`;

                } else if (
                    Number(match.win_by_wickets) > 0
                ) {

                    result =
                        `Won by ${match.win_by_wickets} wickets`;

                }

                return `
                    <tr>

                        <td>
                            ${escapeHTML(matchId)}
                        </td>

                        <td>
                            ${formatDate(match.date)}
                        </td>

                        <td>
                            ${escapeHTML(
                                match.season ?? "—"
                            )}
                        </td>

                        <td>
                            ${escapeHTML(teamsText)}
                        </td>

                        <td>
                            ${escapeHTML(
                                match.winner ?? "—"
                            )}
                        </td>

                        <td>
                            ${escapeHTML(result)}
                        </td>

                        <td>

                            <button
                                class="secondary-button match-view-btn"
                                data-match="${escapeHTML(matchId)}">

                                View

                            </button>

                        </td>

                    </tr>
                `;

            })
            .join("");

    document
        .querySelectorAll(".match-view-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    loadMatch(
                        button.dataset.match
                    );

                }
            );

        });

}

// ============================================================
// MATCH MODAL
// ============================================================

function setupModal() {

    $("close-modal")?.addEventListener(
        "click",
        closeMatchModal
    );

    $("match-modal")?.addEventListener(
        "click",
        event => {

            if (
                event.target.id ===
                "match-modal"
            ) {

                closeMatchModal();

            }

        }
    );

}

function closeMatchModal() {

    $("match-modal")?.classList.add(
        "hidden"
    );

}

async function loadMatch(matchId) {

    try {

        const data =
            await apiFetch(
                `/match/${encodeURIComponent(matchId)}`
            );

        renderMatchDetails(data);

        $("match-modal")?.classList.remove(
            "hidden"
        );

    } catch (error) {

        console.error(
            "Match detail error:",
            error
        );

        alert(
            error.message ||
            "Unable to load match."
        );

    }

}

function renderMatchDetails(data) {

    const match =
        data.match ||
        data;

    const scorecard =
        data.scorecard ||
        data.innings ||
        [];

    let html = `

        <div class="section-heading">

            <div>

                <span class="eyebrow">
                    MATCH DETAILS
                </span>

                <h2>
                    ${escapeHTML(
                        match.team_1 || ""
                    )}
                    vs
                    ${escapeHTML(
                        match.team_2 || ""
                    )}
                </h2>

                <p>
                    ${formatDate(match.date)}
                    • Season
                    ${escapeHTML(
                        match.season ?? "—"
                    )}
                </p>

            </div>

        </div>

        <div class="kpi-grid">

            <div class="metric-card">
                <span>Winner</span>
                <strong>
                    ${escapeHTML(
                        match.winner ?? "—"
                    )}
                </strong>
            </div>

            <div class="metric-card">
                <span>Win by Runs</span>
                <strong>
                    ${formatNumber(
                        match.win_by_runs
                    )}
                </strong>
            </div>

            <div class="metric-card">
                <span>Win by Wickets</span>
                <strong>
                    ${formatNumber(
                        match.win_by_wickets
                    )}
                </strong>
            </div>

            <div class="metric-card">
                <span>Player of Match</span>
                <strong>
                    ${escapeHTML(
                        match.player_of_match ?? "—"
                    )}
                </strong>
            </div>

        </div>
    `;

    if (
        Array.isArray(scorecard) &&
        scorecard.length
    ) {

        html += `

            <div class="panel">

                <div class="panel-heading">
                    <h3>Scorecard</h3>
                </div>

                <div class="table-wrapper">

                    <table>

                        <thead>

                            <tr>
                                <th>Team</th>
                                <th>Runs</th>
                                <th>Wickets</th>
                                <th>Overs</th>
                            </tr>

                        </thead>

                        <tbody>
        `;

        scorecard.forEach(innings => {

            html += `

                <tr>

                    <td>
                        ${escapeHTML(
                            innings.team ||
                            innings.batting_team ||
                            "—"
                        )}
                    </td>

                    <td>
                        ${formatNumber(
                            innings.runs
                        )}
                    </td>

                    <td>
                        ${formatNumber(
                            innings.wickets
                        )}
                    </td>

                    <td>
                        ${formatDecimal(
                            innings.overs
                        )}
                    </td>

                </tr>

            `;

        });

        html += `

                        </tbody>

                    </table>

                </div>

            </div>

        `;

    }

    if ($("match-details")) {

        $("match-details").innerHTML =
            html;

    }

}

// ============================================================
// TEAM ANALYSIS
// ============================================================

async function loadTeams() {

    try {

        const data =
            await apiFetch("/teams");

        teams =
            Array.isArray(data)
                ? data
                : (data.teams || []);

        renderTeams(teams);

    } catch (error) {

        console.error(
            "Teams error:",
            error
        );

        if ($("teams-grid")) {

            $("teams-grid").innerHTML =
                `<p>Unable to load team analytics.</p>`;

        }

    }

}

function getTeamName(team) {

    if (typeof team === "string") {
        return team;
    }

    return (
        team.team ||
        team.name ||
        team.team_name ||
        ""
    );

}

function renderTeams(data) {

    const container =
        $("teams-grid");

    if (!container) {
        return;
    }

    if (!data.length) {

        container.innerHTML =
            `<p>No team data available.</p>`;

        return;

    }

    container.innerHTML =
        data.map(team => {

            const summary =
                team.summary ||
                team.stats ||
                team;

            const name =
                getTeamName(team);

            const matches =
                firstDefined(
                    summary.matches,
                    summary.match_count,
                    0
                );

            const wins =
                firstDefined(
                    summary.wins,
                    0
                );

            const losses =
                firstDefined(
                    summary.losses,
                    0
                );

            const winRate =
                firstDefined(
                    summary.win_percentage,
                    summary.win_rate,
                    0
                );

            const runs =
                firstDefined(
                    summary.runs,
                    summary.total_runs,
                    0
                );

            const sr =
                firstDefined(
                    summary.strike_rate,
                    summary.sr,
                    0
                );

            return `

                <div class="feature-card team-card">

                    <span class="eyebrow">
                        IPL TEAM
                    </span>

                    <h3>
                        ${escapeHTML(name)}
                    </h3>

                    <div class="team-mini-stats">

                        <div>
                            <span>Matches</span>
                            <strong>
                                ${formatNumber(matches)}
                            </strong>
                        </div>

                        <div>
                            <span>Wins</span>
                            <strong>
                                ${formatNumber(wins)}
                            </strong>
                        </div>

                        <div>
                            <span>Losses</span>
                            <strong>
                                ${formatNumber(losses)}
                            </strong>
                        </div>

                        <div>
                            <span>Win %</span>
                            <strong>
                                ${formatDecimal(winRate)}
                            </strong>
                        </div>

                        <div>
                            <span>Runs</span>
                            <strong>
                                ${formatNumber(runs)}
                            </strong>
                        </div>

                        <div>
                            <span>SR</span>
                            <strong>
                                ${formatDecimal(sr)}
                            </strong>
                        </div>

                    </div>

                    <button
                        class="secondary-button team-detail-btn"
                        data-team="${escapeHTML(name)}">

                        View Team Analysis

                    </button>

                </div>
            `;

        })
        .join("");

    document
        .querySelectorAll(".team-detail-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const teamName =
                        button.dataset.team;

                    showSection(
                        "teams-section"
                    );

                    loadTeamDetail(
                        teamName
                    );

                }
            );

        });

}

async function loadTeamDetail(teamName) {

    const detail =
        $("team-detail");

    const content =
        $("team-detail-content");

    if (!content) {

        console.warn(
            "team-detail-content not found in HTML."
        );

        return;

    }

    detail?.classList.remove(
        "hidden"
    );

    content.innerHTML =
        `<p>Loading team analysis...</p>`;

    if ($("team-detail-name")) {

        $("team-detail-name").textContent =
            teamName;

    }

    try {

        const data =
            await apiFetch(
                `/team/${encodeURIComponent(teamName)}`
            );

        renderTeamDetail(
            teamName,
            data
        );

    } catch (error) {

        console.error(
            "Team detail API error:",
            error
        );

        // Fallback to the summary already loaded.
        const existingTeam =
            teams.find(
                team =>
                    getTeamName(team).toLowerCase() ===
                    teamName.toLowerCase()
            );

        if (existingTeam) {

            renderTeamDetail(
                teamName,
                existingTeam
            );

        } else {

            content.innerHTML = `

                <div class="metric-card">

                    <span>Team Analysis</span>

                    <strong>
                        ${escapeHTML(
                            error.message ||
                            "Unable to load team analysis."
                        )}
                    </strong>

                </div>

            `;

        }

    }

}

function renderTeamDetail(
    teamName,
    data
) {

    const content =
        $("team-detail-content");

    if (!content) {
        return;
    }

    const profile =
        data.team ||
        data.profile ||
        data.summary ||
        data;

    const topBatters =
        data.top_batters ||
        data.batters ||
        [];

    const topBowlers =
        data.top_bowlers ||
        data.bowlers ||
        [];

    const phaseStats =
        data.phase_stats ||
        data.phases ||
        [];

    let html = `

        <div class="section-heading">

            <div>

                <span class="eyebrow">
                    TEAM INTELLIGENCE
                </span>

                <h2>
                    ${escapeHTML(teamName)}
                </h2>

            </div>

        </div>

        <div class="kpi-grid">

            <div class="metric-card">
                <span>Matches</span>
                <strong>
                    ${formatNumber(
                        profile.matches
                    )}
                </strong>
            </div>

            <div class="metric-card">
                <span>Wins</span>
                <strong>
                    ${formatNumber(
                        profile.wins
                    )}
                </strong>
            </div>

            <div class="metric-card">
                <span>Losses</span>
                <strong>
                    ${formatNumber(
                        profile.losses
                    )}
                </strong>
            </div>

            <div class="metric-card">
                <span>Win %</span>
                <strong>
                    ${formatDecimal(
                        firstDefined(
                            profile.win_percentage,
                            profile.win_rate
                        )
                    )}
                </strong>
            </div>

            <div class="metric-card">
                <span>Total Runs</span>
                <strong>
                    ${formatNumber(
                        firstDefined(
                            profile.runs,
                            profile.total_runs
                        )
                    )}
                </strong>
            </div>

            <div class="metric-card">
                <span>Strike Rate</span>
                <strong>
                    ${formatDecimal(
                        firstDefined(
                            profile.strike_rate,
                            profile.sr
                        )
                    )}
                </strong>
            </div>

        </div>

    `;

    if (topBatters.length) {

        html += renderTopList(
            "Top Batters",
            topBatters,
            "runs"
        );

    }

    if (topBowlers.length) {

        html += renderTopList(
            "Top Bowlers",
            topBowlers,
            "wickets"
        );

    }

    if (
        Array.isArray(phaseStats) &&
        phaseStats.length
    ) {

        html += renderPhaseTable(
            phaseStats
        );

    }

    content.innerHTML =
        html;

}

function renderPhaseTable(rows) {

    return `

        <div class="panel">

            <div class="panel-heading">

                <div>

                    <span class="eyebrow">
                        PHASE ANALYSIS
                    </span>

                    <h3>
                        Team Scoring by Phase
                    </h3>

                </div>

            </div>

            <div class="table-wrapper">

                <table>

                    <thead>

                        <tr>
                            <th>Phase</th>
                            <th>Runs</th>
                            <th>Balls</th>
                            <th>Strike Rate</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${rows.map(row => `

                            <tr>

                                <td>
                                    ${escapeHTML(
                                        row.phase ||
                                        row.name ||
                                        "—"
                                    )}
                                </td>

                                <td>
                                    ${formatNumber(
                                        firstDefined(
                                            row.runs,
                                            row.total_runs
                                        )
                                    )}
                                </td>

                                <td>
                                    ${formatNumber(
                                        row.balls
                                    )}
                                </td>

                                <td>
                                    ${formatDecimal(
                                        firstDefined(
                                            row.strike_rate,
                                            row.sr
                                        )
                                    )}
                                </td>

                            </tr>

                        `).join("")}

                    </tbody>

                </table>

            </div>

        </div>

    `;

}

function setupTeamControls() {

    $("close-team-detail")?.addEventListener(
        "click",
        () => {

            $("team-detail")?.classList.add(
                "hidden"
            );

        }
    );

}

function renderTopList(
    title,
    rows,
    statKey
) {

    if (
        !Array.isArray(rows) ||
        !rows.length
    ) {

        return "";

    }

    return `

        <div class="panel">

            <div class="panel-heading">

                <div>

                    <span class="eyebrow">
                        TEAM ANALYSIS
                    </span>

                    <h3>
                        ${escapeHTML(title)}
                    </h3>

                </div>

            </div>

            <div class="table-wrapper">

                <table>

                    <thead>

                        <tr>

                            <th>
                                Player
                            </th>

                            <th>
                                ${escapeHTML(statKey)}
                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        ${rows.map(row => {

                            const name =
                                row.player ||
                                row.name ||
                                row.player_name ||
                                row.batter ||
                                row.bowler ||
                                "—";

                            const stats =
                                row.stats ||
                                row;

                            return `

                                <tr>

                                    <td>
                                        ${escapeHTML(name)}
                                    </td>

                                    <td>
                                        ${formatNumber(
                                            stats[statKey]
                                        )}
                                    </td>

                                </tr>

                            `;

                        }).join("")}

                    </tbody>

                </table>

            </div>

        </div>

    `;

}

// ============================================================
// VENUE ANALYSIS
// ============================================================

async function loadVenues() {

    try {

        const data =
            await apiFetch("/venues");

        venues =
            Array.isArray(data)
                ? data
                : (data.venues || []);

        renderVenues(venues);

    } catch (error) {

        console.error(
            "Venues error:",
            error
        );

        if ($("venues-grid")) {

            $("venues-grid").innerHTML =
                `<p>Unable to load venue analytics.</p>`;

        }

    }

}

function getVenueName(venue) {

    if (typeof venue === "string") {
        return venue;
    }

    return (
        venue.venue ||
        venue.name ||
        venue.venue_name ||
        ""
    );

}

function renderVenues(data) {

    const container =
        $("venues-grid");

    if (!container) {
        return;
    }

    if (!data.length) {

        container.innerHTML =
            `<p>No venue data available.</p>`;

        return;

    }

    container.innerHTML =
        data.map(venue => {

            const summary =
                venue.summary ||
                venue.stats ||
                venue;

            const name =
                getVenueName(venue);

            const matches =
                firstDefined(
                    summary.matches,
                    summary.match_count,
                    0
                );

            const runs =
                firstDefined(
                    summary.runs,
                    summary.total_runs,
                    0
                );

            const average =
                firstDefined(
                    summary.average_runs,
                    summary.avg_runs,
                    0
                );

            const runRate =
                firstDefined(
                    summary.run_rate,
                    0
                );

            return `

                <div class="feature-card">

                    <span class="eyebrow">
                        VENUE
                    </span>

                    <h3>
                        ${escapeHTML(name)}
                    </h3>

                    <div class="team-mini-stats">

                        <div>
                            <span>Matches</span>
                            <strong>
                                ${formatNumber(matches)}
                            </strong>
                        </div>

                        <div>
                            <span>Runs</span>
                            <strong>
                                ${formatNumber(runs)}
                            </strong>
                        </div>

                        <div>
                            <span>Avg Runs</span>
                            <strong>
                                ${formatDecimal(average)}
                            </strong>
                        </div>

                        <div>
                            <span>Run Rate</span>
                            <strong>
                                ${formatDecimal(runRate)}
                            </strong>
                        </div>

                    </div>

                    <button
                        class="secondary-button venue-detail-btn"
                        data-venue="${escapeHTML(name)}">

                        View Venue Analysis

                    </button>

                </div>

            `;

        }).join("");

    document
        .querySelectorAll(".venue-detail-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const venueName =
                        button.dataset.venue;

                    showSection(
                        "venues-section"
                    );

                    loadVenueDetail(
                        venueName
                    );

                }
            );

        });

}

async function loadVenueDetail(venueName) {

    const detail =
        $("venue-detail");

    const content =
        $("venue-detail-content");

    if (!content) {
        return;
    }

    detail?.classList.remove(
        "hidden"
    );

    content.innerHTML =
        `<p>Loading venue analysis...</p>`;

    if ($("venue-detail-name")) {

        $("venue-detail-name").textContent =
            venueName;

    }

    try {

        const data =
            await apiFetch(
                `/venue/${encodeURIComponent(venueName)}`
            );

        renderVenueDetail(
            venueName,
            data
        );

    } catch (error) {

        console.error(
            "Venue detail error:",
            error
        );

        const existingVenue =
            venues.find(
                venue =>
                    getVenueName(venue).toLowerCase() ===
                    venueName.toLowerCase()
            );

        if (existingVenue) {

            renderVenueDetail(
                venueName,
                existingVenue
            );

        } else {

            content.innerHTML = `

                <div class="metric-card">

                    <span>Venue Analysis</span>

                    <strong>
                        ${escapeHTML(
                            error.message ||
                            "Unable to load venue analysis."
                        )}
                    </strong>

                </div>

            `;

        }

    }

}

function renderVenueDetail(
    venueName,
    data
) {

    const content =
        $("venue-detail-content");

    if (!content) {
        return;
    }

    const profile =
        data.venue ||
        data.profile ||
        data.summary ||
        data;

    let html = `

        <div class="section-heading">

            <div>

                <span class="eyebrow">
                    VENUE INTELLIGENCE
                </span>

                <h2>
                    ${escapeHTML(venueName)}
                </h2>

            </div>

        </div>

        <div class="kpi-grid">

            <div class="metric-card">
                <span>Matches</span>
                <strong>
                    ${formatNumber(
                        profile.matches
                    )}
                </strong>
            </div>

            <div class="metric-card">
                <span>Total Runs</span>
                <strong>
                    ${formatNumber(
                        firstDefined(
                            profile.runs,
                            profile.total_runs
                        )
                    )}
                </strong>
            </div>

            <div class="metric-card">
                <span>Average Runs</span>
                <strong>
                    ${formatDecimal(
                        firstDefined(
                            profile.average_runs,
                            profile.avg_runs
                        )
                    )}
                </strong>
            </div>

            <div class="metric-card">
                <span>Run Rate</span>
                <strong>
                    ${formatDecimal(
                        profile.run_rate
                    )}
                </strong>
            </div>

        </div>

    `;

    if (
        Array.isArray(data.team_performance) &&
        data.team_performance.length
    ) {

        html += renderTopList(
            "Team Performance",
            data.team_performance,
            "wins"
        );

    }

    if (
        Array.isArray(data.season_stats) &&
        data.season_stats.length
    ) {

        html += renderTopList(
            "Season Statistics",
            data.season_stats,
            "runs"
        );

    }

    content.innerHTML =
        html;

}

function setupVenueControls() {

    $("close-venue-detail")?.addEventListener(
        "click",
        () => {

            $("venue-detail")?.classList.add(
                "hidden"
            );

        }
    );

}

// ============================================================
// MATCHUP ANALYSIS
// ============================================================

function populateMatchupPlayers() {

    const batterSelect =
        $("matchup-batter");

    const bowlerSelect =
        $("matchup-bowler");

    if (
        !batterSelect ||
        !bowlerSelect
    ) {

        return;

    }

    batterSelect.innerHTML =
        `<option value="">Select batter</option>`;

    bowlerSelect.innerHTML =
        `<option value="">Select bowler</option>`;

    players.forEach(player => {

        const name =
            getPlayerName(player);

        if (!name) {
            return;
        }

        const batterOption =
            document.createElement("option");

        batterOption.value = name;
        batterOption.textContent = name;

        const bowlerOption =
            document.createElement("option");

        bowlerOption.value = name;
        bowlerOption.textContent = name;

        batterSelect.appendChild(
            batterOption
        );

        bowlerSelect.appendChild(
            bowlerOption
        );

    });

}

function setupMatchup() {

    $("matchup-btn")?.addEventListener(
        "click",
        loadMatchup
    );

}

async function loadMatchup() {

    const batter =
        $("matchup-batter")?.value;

    const bowler =
        $("matchup-bowler")?.value;

    const resultBox =
        $("matchup-result");

    if (!resultBox) {

        console.warn(
            "matchup-result element not found."
        );

        return;

    }

    if (!batter || !bowler) {

        resultBox.innerHTML = `

            <div class="metric-card">

                <span>
                    Matchup Analysis
                </span>

                <strong>
                    Select both a batter and bowler.
                </strong>

            </div>

        `;

        return;

    }

    if (
        batter.toLowerCase() ===
        bowler.toLowerCase()
    ) {

        resultBox.innerHTML = `

            <div class="metric-card">

                <span>
                    Invalid Matchup
                </span>

                <strong>
                    Please select different players.
                </strong>

            </div>

        `;

        return;

    }

    resultBox.innerHTML = `
        <p>
            Analyzing
            <strong>${escapeHTML(batter)}</strong>
            vs
            <strong>${escapeHTML(bowler)}</strong>...
        </p>
    `;

    try {

        const query =
            `?batter=${encodeURIComponent(batter)}` +
            `&bowler=${encodeURIComponent(bowler)}`;

        const data =
            await apiFetch(
                `/matchup${query}`
            );

        const result =
            data.matchup ||
            data.result ||
            data;

        // Some APIs return an error object instead
        // of throwing HTTP 4xx.
        if (
            result.error &&
            !result.balls &&
            !result.deliveries
        ) {

            throw new Error(
                result.error
            );

        }

        const balls =
            firstDefined(
                result.balls,
                result.deliveries,
                result.legal_balls,
                0
            );

        const runs =
            firstDefined(
                result.runs,
                result.batter_runs,
                0
            );

        const sr =
            firstDefined(
                result.strike_rate,
                result.sr,
                Number(balls) > 0
                    ? Number(runs) /
                      Number(balls) *
                      100
                    : 0
            );

        const dismissals =
            firstDefined(
                result.dismissals,
                result.wickets,
                result.dismissed,
                0
            );

        const fours =
            firstDefined(
                result.fours,
                0
            );

        const sixes =
            firstDefined(
                result.sixes,
                0
            );

        const dots =
            firstDefined(
                result.dot_balls,
                result.dots,
                0
            );

        resultBox.innerHTML = `

            <div class="section-heading">

                <div>

                    <span class="eyebrow">
                        HEAD-TO-HEAD
                    </span>

                    <h3>
                        ${escapeHTML(batter)}
                        vs
                        ${escapeHTML(bowler)}
                    </h3>

                    <p>
                        Historical IPL matchup
                    </p>

                </div>

            </div>

            <div class="kpi-grid">

                <div class="metric-card">

                    <span>
                        Deliveries
                    </span>

                    <strong>
                        ${formatNumber(balls)}
                    </strong>

                </div>

                <div class="metric-card">

                    <span>
                        Runs
                    </span>

                    <strong>
                        ${formatNumber(runs)}
                    </strong>

                </div>

                <div class="metric-card">

                    <span>
                        Strike Rate
                    </span>

                    <strong>
                        ${formatDecimal(sr)}
                    </strong>

                </div>

                <div class="metric-card">

                    <span>
                        Dismissals
                    </span>

                    <strong>
                        ${formatNumber(
                            dismissals
                        )}
                    </strong>

                </div>

                <div class="metric-card">

                    <span>
                        Fours
                    </span>

                    <strong>
                        ${formatNumber(fours)}
                    </strong>

                </div>

                <div class="metric-card">

                    <span>
                        Sixes
                    </span>

                    <strong>
                        ${formatNumber(sixes)}
                    </strong>

                </div>

                <div class="metric-card">

                    <span>
                        Dot Balls
                    </span>

                    <strong>
                        ${formatNumber(dots)}
                    </strong>

                </div>

            </div>

        `;

    } catch (error) {

        console.error(
            "Matchup error:",
            error
        );

        resultBox.innerHTML = `

            <div class="metric-card">

                <span>
                    Matchup Analysis
                </span>

                <strong>
                    ${escapeHTML(
                        error.message ||
                        "No matchup data available."
                    )}
                </strong>

                <p>
                    Try selecting another batter and bowler.
                </p>

            </div>

        `;

    }

}

// ============================================================
// AI ANALYST
// ============================================================

function setupAI() {

    $("ai-send")?.addEventListener(
        "click",
        sendAIQuestion
    );

    $("ai-question")?.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendAIQuestion();

            }

        }
    );

}

async function sendAIQuestion() {

    const input =
        $("ai-question");

    const question =
        input?.value.trim();

    if (!question) {
        return;
    }

    appendAIMessage(
        "You",
        question,
        "user"
    );

    input.value = "";

    try {

        const data =
            await apiFetch(
                "/ai/chat",
                {
                    method: "POST",

                    body: JSON.stringify({
                        question
                    })
                }
            );

        const answer =
            data.answer ||
            data.response ||
            data.message ||
            "No answer returned.";

        appendAIMessage(
            "SportsIQ AI",
            answer,
            "ai"
        );

    } catch (error) {

        appendAIMessage(
            "SportsIQ AI",
            error.message ||
            "Unable to contact AI analyst.",
            "ai"
        );

    }

}

function appendAIMessage(
    sender,
    message,
    type
) {

    const container =
        $("ai-messages");

    if (!container) {
        return;
    }

    const div =
        document.createElement("div");

    div.className =
        `ai-message ${type || ""}`;

    div.innerHTML = `

        <strong>
            ${escapeHTML(sender)}
        </strong>

        <p>
            ${escapeHTML(message)}
        </p>

    `;

    container.appendChild(div);

    container.scrollTop =
        container.scrollHeight;

}

// ============================================================
// REFRESH
// ============================================================

function setupRefresh() {

    $("refresh-btn")?.addEventListener(
        "click",
        async () => {

            const button =
                $("refresh-btn");

            if (button) {
                button.disabled = true;
            }

            try {

                await loadHealth();
                await loadOverview();
                await loadPlayers();
                await loadMatches();
                await loadTeams();
                await loadVenues();

            } catch (error) {

                console.error(
                    "Refresh error:",
                    error
                );

            } finally {

                if (button) {
                    button.disabled = false;
                }

            }

        }
    );

}