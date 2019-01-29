onGotSettings(function() {
  if (settings.notifContentEnable) {
    function processNotifications(containerElem) {
      let uniqueIDs = [];
      for (let i = 0; i < containerElem.children.length; i++) {
        let elem = containerElem.children[i];
        let detailsElem = elem.getElementsByClassName("details")[0];
        if (detailsElem && detailsElem.textContent.indexOf("aired") === -1) {
          let path = detailsElem.getElementsByClassName("link")[0].href.split("/");
          let id = Number(path[path.length - 1]);
          elem.dataset.amncId = id;
          if (uniqueIDs.indexOf(id) === -1) {
            uniqueIDs.push(id);
          }
        }
      }
      getActivityInfos({ ids: uniqueIDs }).then(activityInfos => {
        for (let i = 0; i < activityInfos.length; i++) {
          let activity = activityInfos[i];
          let handledTypes = ["TEXT", "ANIME_LIST", "MANGA_LIST", "MESSAGE"];
          if (handledTypes.indexOf(activity.type) !== -1) {
            [...containerElem.querySelectorAll(`[data-amnc-id="${activity.id}"]`)].forEach((elem, i) => {
              let detailsElem = elem.getElementsByClassName("details")[0];

              let contentElem = document.createElement("div");
              contentElem.classList.add("amnc");

              if (detailsElem.textContent.indexOf("replied to your activity") !== -1) {
                let username = detailsElem.getElementsByClassName("link")[0].textContent.trim().split(" ")[0].trim();
                let j = 0;
                for (let k = activity.replies.length - 1; k >= 0; k--) {
                  if (activity.replies[k].user.name === username) j++;
                  if (j === i) {
                    contentElem.textContent = activity.replies[k].text;
                    detailsElem.insertBefore(contentElem, detailsElem.children[1]);
                    break;
                  }
                }
              } else if (activity.type === "TEXT") {
                contentElem.textContent = activity.text;
                detailsElem.insertBefore(contentElem, detailsElem.children[1]);
              } else if (activity.type === "ANIME_LIST" || activity.type === "MANGA_LIST") {
                getSeriesInfo(activity.media.id, activity.media.type).then(media => {
                  let text;
                  let title = getTitle(media.title, settings.titleLanguage);
                  if (activity.status === "watched episode") {
                    text = `Watched episode ${activity.progress} of ${title}`;
                  } else if (activity.status === "read chapter") {
                    text = `Read chapter ${activity.progress} of ${title}`;
                  } else {
                    text = capitalize(activity.status, CAPITALIZE_FIRST) + " " + title;
                  }
                  contentElem.textContent = text;
                  detailsElem.insertBefore(contentElem, detailsElem.children[1]);
                });
              } else if (activity.type === "MESSAGE") {
                contentElem.textContent = activity.message;
                detailsElem.insertBefore(contentElem, detailsElem.children[1]);
              }
            });
          }
        }
      });
    }

    function checkContainerElem() {
      let containerElem = document.getElementsByClassName("notifications")[0];
      let pattern = /(http|https):\/\/(www.)*anilist.co\/notifications$/i;
      if (pattern.test(window.location.href) && containerElem) {
        let notificationElems = containerElem.getElementsByClassName("notification");
        if (notificationElems.length) {
          processNotifications(containerElem);
        } else {
          onElementChange(containerElem, function(changes, observer) {
            if (changes[0].addedNodes[0] && changes[0].addedNodes[0].classList.contains("notification")) {
              processNotifications(containerElem);
              observer.disconnect();
            }
          });
        }
      }
    }

    checkContainerElem();
    onNavigate(function() {
      checkContainerElem();
    });
  }
});