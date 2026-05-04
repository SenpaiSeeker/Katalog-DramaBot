const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

const bgMusic = new Audio("https://raw.githubusercontent.com/SenpaiSeeker/tools/main/audio.mp3");
bgMusic.loop = true;
function playMusic() {
    if (bgMusic.paused) {
        bgMusic.play().catch(() => {});
        document.removeEventListener("click", playMusic);
    }
}
document.addEventListener("click", playMusic);

let mediaCatalog = [];
let botApiToken = "";
let botUsername = "";
let currentTheme = "Dark";
let activeCategory = "ALL";
let searchQuery = "";
let favoriteList = [];
let watchHistory = [];
let mainButtonCallback = null;

(function initParticleSystem() {
    const canvas = document.getElementById("titleCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const particles = [];
    const MAX_PARTICLES = 80;

    function resizeCanvas() {
        const header = canvas.parentElement;
        canvas.width = header.offsetWidth;
        canvas.height = header.offsetHeight;
    }

    function createParticle() {
        const header = canvas.parentElement;
        const titleEl = document.getElementById("mainHeaderTitle");
        const hRect = header.getBoundingClientRect();
        const tRect = titleEl
            ? titleEl.getBoundingClientRect()
            : { left: 0, top: 0, width: 120, height: 30 };
        const cx = tRect.left - hRect.left + tRect.width / 2;
        const cy = tRect.top - hRect.top + tRect.height / 2;
        const spread = tRect.width * 0.8;
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * spread + 8;
        return {
            x: cx + Math.cos(angle) * r * 0.6,
            y: cy + Math.sin(angle) * r * 0.4 + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 1.4,
            vy: (Math.random() - 0.5) * 1.4 - 0.3,
            size: Math.random() * 2.8 + 0.4,
            hue: Math.random() * 360,
            hueSpeed: Math.random() * 3 + 1,
            alpha: Math.random() * 0.7 + 0.3,
            life: 1,
            decay: Math.random() * 0.006 + 0.003,
            twinkle: Math.random() * Math.PI * 2,
            twinkleSpeed: Math.random() * 0.09 + 0.03
        };
    }

    function drawFrame() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        while (particles.length < MAX_PARTICLES) particles.push(createParticle());
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.hue = (p.hue + p.hueSpeed) % 360;
            p.life -= p.decay;
            p.twinkle += p.twinkleSpeed;
            if (p.life <= 0 || p.size < 0.1) {
                particles.splice(i, 1);
                continue;
            }
            const twinkleFactor = 0.7 + 0.3 * Math.sin(p.twinkle);
            const alpha = p.life * p.alpha * twinkleFactor;
            const glow = p.size * 5 + Math.sin(p.twinkle) * 2;
            const color = `hsl(${p.hue}, 100%, 65%)`;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.shadowColor = color;
            ctx.shadowBlur = glow;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = alpha * 0.35;
            ctx.shadowBlur = glow * 2.5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        requestAnimationFrame(drawFrame);
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    drawFrame();
})();

if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    const sessionUser = tg.initDataUnsafe.user;
    const profilePicUrl =
        sessionUser.photo_url ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(sessionUser.first_name)}&background=random`;
    document.getElementById("userName").innerText =
        sessionUser.first_name + (sessionUser.last_name ? " " + sessionUser.last_name : "");
    document.getElementById("userId").innerText = "ID: " + sessionUser.id;
    document.getElementById("userAvatar").src = profilePicUrl;
}

const storageManager = {
    syncToCloud: async (dataBundle) => {
        if (tg.CloudStorage) {
            tg.CloudStorage.setItem("vod_fav", JSON.stringify(dataBundle.favorites));
            tg.CloudStorage.setItem("vod_hst", JSON.stringify(dataBundle.history));
        }
        localStorage.setItem("vod_fav", JSON.stringify(dataBundle.favorites));
        localStorage.setItem("vod_hst", JSON.stringify(dataBundle.history));
    },
    syncFromCloud: async () =>
        new Promise((resolve) => {
            const handleStorageResult = (favData, histData) =>
                resolve({
                    favorites: favData ? JSON.parse(favData) : [],
                    history: histData ? JSON.parse(histData) : []
                });
            if (tg.CloudStorage) {
                tg.CloudStorage.getKeys((err, keys) => {
                    if (keys && keys.length) {
                        tg.CloudStorage.getItems(["vod_fav", "vod_hst"], (err, values) =>
                            handleStorageResult(values.vod_fav, values.vod_hst)
                        );
                    } else {
                        handleStorageResult(
                            localStorage.getItem("vod_fav"),
                            localStorage.getItem("vod_hst")
                        );
                    }
                });
            } else {
                handleStorageResult(
                    localStorage.getItem("vod_fav"),
                    localStorage.getItem("vod_hst")
                );
            }
        })
};

function triggerLightHaptic() {
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
}

function triggerHeavyHaptic() {
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred("heavy");
}

function getFallbackImage(value, sourceType) {
    if (!value && sourceType === "img") {
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231f2436'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23556488' font-family='sans-serif' font-size='10' font-weight='bold'%3EPOSTER NOT FOUND%3C/text%3E%3C/svg%3E`;
    }
    return value && value.startsWith("http")
        ? value
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(value || "MD")}&background=random&size=300&bold=true`;
}

const imageFetchQueue = [];
let isQueueProcessing = false;

function resolveTelegramImage(fileId) {
    if (!fileId || !botApiToken) return Promise.resolve(getFallbackImage(null, "img"));
    const cacheKey = "T_" + fileId;
    const cachedImage = sessionStorage.getItem(cacheKey);
    if (cachedImage) return Promise.resolve(cachedImage);
    return new Promise((resolve) => {
        imageFetchQueue.push(async () => {
            try {
                const requestConfig = await fetch(
                    `https://api.telegram.org/bot${botApiToken}/getFile?file_id=${fileId}`
                );
                const jsonResponse = await requestConfig.json();
                if (jsonResponse.ok && jsonResponse.result.file_path) {
                    const validatedUrl = `https://api.telegram.org/file/bot${botApiToken}/${jsonResponse.result.file_path}`;
                    sessionStorage.setItem(cacheKey, validatedUrl);
                    resolve(validatedUrl);
                } else if (jsonResponse.error_code === 429) {
                    const delaySeconds = (jsonResponse.parameters.retry_after || 1.5) * 1000;
                    await new Promise((r) => setTimeout(r, delaySeconds));
                    const retryRequest = await fetch(
                        `https://api.telegram.org/bot${botApiToken}/getFile?file_id=${fileId}`
                    );
                    const retryJsonResponse = await retryRequest.json();
                    if (retryJsonResponse.ok && retryJsonResponse.result.file_path) {
                        const validatedRetryUrl = `https://api.telegram.org/file/bot${botApiToken}/${retryJsonResponse.result.file_path}`;
                        sessionStorage.setItem(cacheKey, validatedRetryUrl);
                        resolve(validatedRetryUrl);
                    } else {
                        resolve(getFallbackImage(null, "img"));
                    }
                } else {
                    resolve(getFallbackImage(null, "img"));
                }
            } catch (e) {
                resolve(getFallbackImage(null, "img"));
            }
        });
        processImageScheduler();
    });
}

async function processImageScheduler() {
    if (isQueueProcessing || imageFetchQueue.length === 0) return;
    isQueueProcessing = true;
    while (imageFetchQueue.length > 0) {
        const taskOperation = imageFetchQueue.shift();
        await taskOperation();
        await new Promise((res) => setTimeout(res, 80));
    }
    isQueueProcessing = false;
}

function makeTappable(el, callback) {
    let startX = 0;
    let startY = 0;
    let moved = false;
    el.addEventListener("touchstart", (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        moved = false;
    }, { passive: true });
    el.addEventListener("touchmove", (e) => {
        const dx = Math.abs(e.touches[0].clientX - startX);
        const dy = Math.abs(e.touches[0].clientY - startY);
        if (dx > 8 || dy > 8) moved = true;
    }, { passive: true });
    el.addEventListener("touchend", (e) => {
        if (!moved) {
            e.preventDefault();
            callback();
        }
    }, { passive: false });
    el.addEventListener("click", callback);
}

function initializeApplication() {
    currentTheme = localStorage.getItem("thM_X") || "Dark";
    applyThemePalette(currentTheme);
    storageManager.syncFromCloud().then((storageData) => {
        favoriteList = storageData.favorites;
        watchHistory = storageData.history;
        parseLaunchParams();
    });
}

function toggleAppTheme() {
    triggerLightHaptic();
    currentTheme = currentTheme === "Dark" ? "Light" : "Dark";
    localStorage.setItem("thM_X", currentTheme);
    applyThemePalette(currentTheme);
}

function applyThemePalette(themeMode) {
    const themeIconNode = document.querySelector("#ic-t svg");
    if (themeMode === "Dark") {
        document.body.classList.remove("light-theme");
        themeIconNode.innerHTML =
            '<path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>';
        tg.setHeaderColor?.("#03050d");
        tg.setBackgroundColor?.("#03050d");
    } else {
        document.body.classList.add("light-theme");
        themeIconNode.innerHTML =
            '<path d="M12 5.5c-3.58 0-6.5 2.92-6.5 6.5s2.92 6.5 6.5 6.5 6.5-2.92 6.5-6.5-2.92-6.5-6.5-6.5zM2 12c0-5.52 4.48-10 10-10s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12z"/>';
        tg.setHeaderColor?.("#eef0ff");
        tg.setBackgroundColor?.("#eef0ff");
    }
}

async function parseLaunchParams() {
    const payloadToken = new URLSearchParams(location.search).get("token");
    if (payloadToken) {
        try {
            const decodedToken = atob(payloadToken.replace(/-/g, "+").replace(/_/g, "/"));
            const tokenParts = decodedToken.split("|");
            botApiToken = tokenParts[0];
            fetch(`https://api.telegram.org/bot${botApiToken}/getMe`)
                .then((response) => response.json())
                .then((botInfo) => {
                    if (botInfo.ok) {
                        if (botInfo.result.username) botUsername = botInfo.result.username;
                        if (botInfo.result.first_name) {
                            document.getElementById("mainHeaderTitle").innerText =
                                botInfo.result.first_name.toUpperCase();
                        }
                    }
                });
            if (tokenParts[1]) {
                const externalPayload = tokenParts[1];
                if (externalPayload.startsWith("B64_")) {
                    const jsonDecodeData = decodeURIComponent(
                        escape(
                            atob(externalPayload.substring(4).replace(/-/g, "+").replace(/_/g, "/"))
                        )
                    );
                    mediaCatalog = JSON.parse(jsonDecodeData);
                } else {
                    const telegraFetchUrl = await fetch(
                        `https://api.telegra.ph/getPage/${externalPayload}?return_content=true`
                    );
                    const telegraData = await telegraFetchUrl.json();
                    let consolidatedText = "";
                    if (telegraData.ok && telegraData.result.content) {
                        telegraData.result.content.forEach((nodeData) => {
                            if (nodeData.children) consolidatedText += nodeData.children[0];
                        });
                        mediaCatalog = JSON.parse(consolidatedText);
                    }
                }
            }
        } catch (err) {}
    }
    buildCategoryFilter();
    renderUserInterface();
}

function buildCategoryFilter() {
    const categoriesExtract = ["ALL", ...new Set(mediaCatalog.map((item) => item.c))].filter(Boolean);
    const categoryBoxContainer = document.getElementById("catBox");
    categoryBoxContainer.innerHTML = "";
    categoriesExtract.forEach((catName) => {
        const chipElement = document.createElement("div");
        chipElement.className = "cat-chip" + (catName === "ALL" ? " active" : "");
        chipElement.innerText = catName;

        makeTappable(chipElement, () => {
            triggerLightHaptic();
            document.querySelectorAll(".cat-chip").forEach((c) => c.classList.remove("active"));
            chipElement.classList.add("active");
            activeCategory = catName;
            renderUserInterface();
        });

        categoryBoxContainer.appendChild(chipElement);
    });
}

document.getElementById("iptSearch").addEventListener("input", (eventInput) => {
    searchQuery = eventInput.target.value.toLowerCase();
    renderUserInterface();
});

function switchInterfaceView(viewDomain, elementFocus) {
    triggerLightHaptic();
    document.querySelectorAll(".view").forEach((viewNode) => viewNode.classList.remove("active"));
    document.getElementById(viewDomain).classList.add("active");
    document.querySelectorAll(".ntb").forEach((navBtn) => navBtn.classList.remove("active"));
    elementFocus.classList.add("active");
    window.scrollTo(0, 0);
    renderUserInterface();
}

function populateBookmarkGrid(domId, memoryList) {
    const filteredNodes = mediaCatalog.filter((catalogItem) => memoryList.includes(catalogItem.id));
    const baseContainer = document.getElementById(domId);
    baseContainer.innerHTML = "";
    filteredNodes.forEach((movieItem) => createMediaCard(movieItem, baseContainer));
    document.getElementById(domId === "gh" ? "hs-e" : "f-e").style.display = filteredNodes.length
        ? "none"
        : "block";
}

function renderUserInterface() {
    if (document.getElementById("v-home").classList.contains("active")) {
        const queryResultStream = mediaCatalog.filter(
            (movieRecord) =>
                movieRecord.t.toLowerCase().includes(searchQuery) &&
                (activeCategory === "ALL" || movieRecord.c === activeCategory)
        );
        const coreGridBase = document.getElementById("gr");
        const slideCarouselBox = document.getElementById("cr");
        coreGridBase.innerHTML = "";
        slideCarouselBox.innerHTML = "";

        const featuredSelection = queryResultStream.filter((p) => p.is_prem);
        if (!searchQuery && activeCategory === "ALL" && featuredSelection.length) {
            featuredSelection.slice(0, 2).forEach((premiumHighlight) => {
                const cardDisplayBlueprint = document.createElement("div");
                cardDisplayBlueprint.className = "hero-card skeleton";
                cardDisplayBlueprint.innerHTML = `
                    <img class="hero-bg" style="opacity:0;"/>
                    <img class="hero-img" style="opacity:0;"/>
                    <div class="hero-content">
                        <span class="tag-hero">✦ PREMIUM VIP</span>
                        <div class="hero-title">${premiumHighlight.t}</div>
                    </div>`;
                cardDisplayBlueprint.onclick = () => openMediaDetails(premiumHighlight.id);
                slideCarouselBox.appendChild(cardDisplayBlueprint);

                resolveTelegramImage(premiumHighlight.p).then((validPhotoSrc) => {
                    const renderBundleArr = cardDisplayBlueprint.querySelectorAll("img");
                    const blurredWallpaperNode = renderBundleArr[0];
                    const centralPhotoNode = renderBundleArr[1];
                    blurredWallpaperNode.src = validPhotoSrc;
                    centralPhotoNode.src = validPhotoSrc;
                    blurredWallpaperNode.onload = () => {
                        cardDisplayBlueprint.classList.remove("skeleton");
                        blurredWallpaperNode.style.opacity = 0.5;
                        centralPhotoNode.style.opacity = 1;
                    };
                });
            });
        }

        queryResultStream.forEach((basicMediaMap) => createMediaCard(basicMediaMap, coreGridBase));
        document.getElementById("h-e").style.display = queryResultStream.length ? "none" : "block";
    } else if (document.getElementById("v-fav").classList.contains("active")) {
        populateBookmarkGrid("gf", favoriteList);
    } else {
        populateBookmarkGrid("gh", watchHistory);
    }
}

function createMediaCard(resourceItem, destinationContainer) {
    const ephemeralIdStr = "renderID_" + resourceItem.id + Math.random().toString(36).substr(2, 5);
    const standardCardRoot = document.createElement("div");
    standardCardRoot.className = "item" + (resourceItem.is_prem ? " is-prem" : "");

    const epCount = resourceItem.tp || 1;
    const statusBadge = resourceItem.is_prem
        ? '<span class="status-badge vip">VIP</span>'
        : '<span class="status-badge free">FREE</span>';
    const posterBadge = resourceItem.is_prem
        ? '<div class="poster-badge vip">VIP</div>'
        : '<div class="poster-badge free">FREE</div>';

    standardCardRoot.innerHTML = `
        <div class="poster skeleton">
            ${posterBadge}
            <img id="${ephemeralIdStr}" style="opacity:0;width:100%;height:100%;object-fit:cover;transition:opacity 0.5s;" />
        </div>
        <div class="details">
            <div class="t-m">${resourceItem.t}</div>
            <div class="type-m">
                <span class="c-label">${resourceItem.c || "—"}</span>
                <div class="right-badges">
                    <span class="ep-count">${epCount}ep</span>
                    ${statusBadge}
                </div>
            </div>
        </div>`;

    standardCardRoot.onclick = () => openMediaDetails(resourceItem.id);
    destinationContainer.appendChild(standardCardRoot);

    const posterGraphicDOM = document.getElementById(ephemeralIdStr);
    resolveTelegramImage(resourceItem.p).then((securedSrcVal) => {
        if (posterGraphicDOM) {
            posterGraphicDOM.onload = () => {
                posterGraphicDOM.style.opacity = 1;
                posterGraphicDOM.parentElement.classList.remove("skeleton");
            };
            posterGraphicDOM.src = securedSrcVal;
        }
    });
}

function openMediaDetails(databaseKey) {
    triggerHeavyHaptic();
    const targetMovieResource = mediaCatalog.find((registryX) => registryX.id === databaseKey);
    if (!targetMovieResource) return;

    const displayGraphicCenter = document.getElementById("mimg");
    resolveTelegramImage(targetMovieResource.p).then(
        (safeFetchResult) => (displayGraphicCenter.src = safeFetchResult)
    );

    document.getElementById("mti").innerText = targetMovieResource.t;

    const epLabel = targetMovieResource.tp || 1;
    const catLabel = targetMovieResource.c || "Film/Video";
    const pricingToken = targetMovieResource.is_prem
        ? '<span class="gold">💎 PREMIUM VIP</span>'
        : '<span class="free">⭐ FREE</span>';

    document.getElementById("mmet").innerHTML =
        `<span class="meta-item">📂 ${catLabel}</span><span class="dot">•</span><span class="meta-item">🎞 ${epLabel} Ep/Part</span><span class="dot">•</span>${pricingToken}`;

    document.getElementById("msyn").innerText =
        targetMovieResource.s && targetMovieResource.s !== "undefined"
            ? targetMovieResource.s
            : "Tap Tonton untuk melanjutkan. Konten diamankan secara Fsub khusus bot ini.";

    const checkBookmarkActive = favoriteList.includes(databaseKey);
    const favBtnEl = document.querySelector("#btFav .bs-icon-btn");
    const favSvg = document.getElementById("btFIc");

    if (checkBookmarkActive) {
        favBtnEl.classList.add("active-fav");
        favSvg.style.fill = "#f59e0b";
        favSvg.style.stroke = "#f59e0b";
        favSvg.style.filter = "drop-shadow(0 0 6px rgba(245,158,11,0.7))";
    } else {
        favBtnEl.classList.remove("active-fav");
        favSvg.style.fill = "none";
        favSvg.style.stroke = "currentColor";
        favSvg.style.filter = "none";
    }

    const bsPostGlow = document.querySelector(".bs-poster-glow");
    if (bsPostGlow) {
        bsPostGlow.style.background = checkBookmarkActive
            ? "radial-gradient(ellipse, rgba(245,158,11,0.45), transparent 70%)"
            : "radial-gradient(ellipse, rgba(124,58,237,0.45), transparent 70%)";
    }

    document.getElementById("btFav").onclick = () => {
        triggerLightHaptic();
        if (favoriteList.includes(databaseKey)) {
            favoriteList = favoriteList.filter((uid_exclude) => uid_exclude !== databaseKey);
        } else {
            favoriteList.unshift(databaseKey);
        }
        storageManager.syncToCloud({ favorites: favoriteList, history: watchHistory });
        renderUserInterface();
        closeMediaDetails();
    };

    document.getElementById("btShare").onclick = () => {
        if (tg.switchInlineQuery) {
            tg.switchInlineQuery(targetMovieResource.t, ["users", "groups"]);
        }
    };

    tg.MainButton.text = targetMovieResource.is_prem ? "⭐ TONTON VIDEO (VIP) ⭐" : "▶ PUTAR MOVIE GRATIS";
    tg.MainButton.color = targetMovieResource.is_prem ? "#f59e0b" : "#7c3aed";
    tg.MainButton.textColor = "#ffffff";

    if (mainButtonCallback) {
        tg.MainButton.offClick(mainButtonCallback);
    }

    mainButtonCallback = () => {
        watchHistory = [databaseKey, ...watchHistory.filter((hUID) => hUID !== databaseKey)].slice(0, 30);
        storageManager.syncToCloud({ favorites: favoriteList, history: watchHistory });
        const redirectRouteBase = botUsername ? botUsername : "BOT";
        tg.openTelegramLink(`https://t.me/${redirectRouteBase}?start=mp_${databaseKey}`);
        setTimeout(() => tg.close(), 150);
    };

    tg.MainButton.onClick(mainButtonCallback);
    tg.MainButton.show();

    document.getElementById("msh").classList.add("open");
    document.getElementById("mbg").classList.add("open");
}

function closeMediaDetails() {
    document.getElementById("msh").classList.remove("open");
    document.getElementById("mbg").classList.remove("open");
    tg.MainButton.hide();
    if (mainButtonCallback) {
        tg.MainButton.offClick(mainButtonCallback);
        mainButtonCallback = null;
    }
}

initializeApplication();
