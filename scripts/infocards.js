function getFormatString(format, countryOfOrigin) {
  if (!countryOfOrigin || countryOfOrigin == "JP") {
    return strings.format[format];
  }
  const key = `${format}_${countryOfOrigin}`;
  if (strings.format.hasOwnProperty(key)) {
    return strings.format[key];
  } else {
    return strings.format[format];
  }
}

onGotSettings(function() {
  if (settings.cardsEnable) {
    const INFOCARDS_MAX_GENRES = 4;

    function makeRankingPeriodString(ranking) {
      if (!ranking.season && ranking.year === null) {
        return "";
      } else {
        return `(${ranking.season ? strings.seasonShort[ranking.season] + " " : ""}${ranking.year ? ranking.year : ""})`;
      }
    }

    function makeRankingHTML(ranking) {
      return `
<div class="amc_ranking">
  <span class="amc_ranking_period">${makeRankingPeriodString(ranking)}</span>
  <span class="amc_ranking_ranking">${icon(ranking.type === "POPULAR" ? "heart" : "star")}#${ranking.rank}</span>
</div>
      `;
    }

    function makeCardHTML(info, derived) {
      return `
<div class="amc_cover">
  <div class="amc_image" style="background-image: url(${info.coverImage.large})"></div>
  <div class="amc_underimage">
    ${derived.displayedScore !== null ? `<div class="amc_rating">${derived.displayedScore}%</div>` : ""}
    ${derived.hasRankings ? `
      <div class="amc_rankings">
        ${makeRankingHTML(info.rankings[0])}
        ${makeRankingHTML(info.rankings[1])}
      </div>
      ` : ""}
  </div>
</div>
<div class="amc_info">
  <h2 class="amc_title">
    <a href="/${info.type.toLowerCase()}/${info.id}">${getTitle(info.title, settings.titleLanguage)}</a>
    ${info.bannerImage ? `<div class="amc_banner" style="background-image: url(${info.bannerImage})"></div>` : ""}
  </h2>
  <div class="amc_description">${stripHTML(info.description || "")}</div>
  <div class="amc_stats">
    ${
      [
        info.format ? `<div class="amc_stats_format">${getFormatString(info.format, info.countryOfOrigin)}</div>` : "",
        derived.isAnime
          ? (info.episodes ? `<div class="amc_stats_episodes">${info.episodes} eps.</div>` : "")
          : (info.volumes ? `<div class="amc_stats_volumes">${info.volumes} vols.</div>` : ""),
        info.startDate.year
          ? info.season && info.startDate.year >= new Date().getFullYear()
            ? `<div class="amc_stats_season">${strings.seasonShort[info.season]} ${info.startDate.year}</div>`
            : `<div class="amc_stats_season">${info.startDate.year}</div>`
          : "",
        info.genres && info.genres.length
          ? `<div class="amc_stats_genres">
            ${info.genres.slice(0, INFOCARDS_MAX_GENRES).join(", ")}
            ${info.genres.length - INFOCARDS_MAX_GENRES > 0 ? ` (+${info.genres.length - INFOCARDS_MAX_GENRES})` : ""}
            </div>`
          : ""
      ].filter(str => str.length).join(`&nbsp;${CHAR_BULLET}&nbsp;`)
    }
  </div>
</div>
      `;
    }

    document.body.addEventListener("mouseover", e => {
      let elem = e.target;
      // console.log(elem);
      let href;
      if (elem instanceof Element) { // proceed to check if it is a valid link
        if (elem.classList.contains("title") && elem.href) {
          href = elem.href;
        } else if (elem.classList.contains("name") && elem.parentElement.parentElement.classList.contains("media")) {
          href = elem.parentElement.href;
        } else if (elem.tagName === "A" && elem.parentElement.classList.contains("title")) {
          href = elem.href;
        } else if (
          (elem.classList.contains("title") || elem.classList.contains("info"))
          && elem.parentElement.parentElement.parentElement.parentElement.classList.contains("media-embed")
          && (
            elem.parentElement.parentElement.parentElement.parentElement.dataset.mediaType === "anime"
            || elem.parentElement.parentElement.parentElement.parentElement.dataset.mediaType === "manga"
          )
        ) {
          href = elem.parentElement.parentElement.parentElement.parentElement.href;
        }
      }
      if (href) {
        let url = new URL(href);
        let path = url.pathname.slice(1).split("/");
        let id = Number(path[1]);
        let type = path[0].toUpperCase();

        if (type === "ANIME" || type === "MANGA") {
          handleCard(elem, settings.cardsHoverTimeout, function() {
            return getSeriesInfo(id, type);
          }, function(info) {
            let isAnime = info.type === "ANIME";
            let hasRankings = info.rankings.length >= 2;
            let displayedScore = info.averageScore || info.meanScore || null;

            let cardElem = makeCard(elem, makeCardHTML(info, { isAnime, hasRankings, displayedScore }));

            cardElem.dataset.id = id;
            cardElem.classList.add("amc");

            if (!info.bannerImage) {
              cardElem.classList.add("amc--nobannerimage");
            }
            if (!hasRankings && displayedScore === null) {
              cardElem.classList.add("amc--nonumbers");
            }

            document.body.appendChild(cardElem);
            return cardElem;
          });
        }
      }
    });
  }
});
