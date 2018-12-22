function makeQueryString(options) {
  return `
query ($page: Int, $types: [NotificationType]) {
  Page (page: $page) {
    pageInfo {
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }
    notifications (type_in: $types, resetNotificationCount: ${options.resetNotificationCount || false}) {
      ... on AiringNotification {
        id
        type
        episode
        contexts
        media {
          id
          type
          title {
            userPreferred
          }
          coverImage {
            large
          }
        }
        createdAt
      }
      ... on FollowingNotification {
        id
        type
        context
        user {
          id
          name
          avatar {
            large
          }
        }
        createdAt
      }
      ... on ActivityMessageNotification {
        id
        type
        context
        activityId
        user {
          id
          name
          avatar {
            large
          }
        }
        createdAt
      }
      ... on ActivityMentionNotification {
        id
        type
        context
        activityId
        user {
          id
          name
          avatar {
            large
          }
        }
        createdAt
      }
      ... on ActivityReplyNotification {
        id
        type
        context
        activityId
        user {
          id
          name
          avatar {
            large
          }
        }
        createdAt
      }
      ... on ActivityLikeNotification {
        id
        type
        context
        activityId
        user {
          id
          name
          avatar {
            large
          }
        }
        createdAt
      }
      ... on ActivityReplyLikeNotification {
        id
        type
        context
        activityId
        user {
          id
          name
          avatar {
            large
          }
        }
        createdAt
      }
      ... on ThreadCommentMentionNotification {
        id
        type
        context
        commentId
        thread {
          id
          title
        }
        user {
          id
          name
          avatar {
            large
          }
        }
        createdAt
      }
      ... on ThreadCommentReplyNotification {
        id
        type
        context
        commentId
        thread {
          id
          title
        }
        user {
          id
          name
          avatar {
            large
          }
        }
        createdAt
      }
      ... on ThreadCommentSubscribedNotification {
        id
        type
        context
        commentId
        thread {
          id
          title
        }
        user {
          id
          name
          avatar {
            large
          }
        }
        createdAt
      }
      ... on ThreadCommentLikeNotification {
        id
        type
        context
        commentId
        thread {
          id
          title
        }
        user {
          id
          name
          avatar {
            large
          }
        }
        createdAt
      }
      ... on ThreadLikeNotification {
        id
        type
        context
        thread {
          id
          title
        }
        user {
          id
          name
          avatar {
            large
          }
        }
        createdAt
      }
    }
  }
}
    `; // lifted from AniList's source because I have no idea about GraphQL. sorry.
}
let variables = {
  page: 0,
  types: [
    "ACTIVITY_MESSAGE", "ACTIVITY_REPLY", "ACTIVITY_LIKE", "ACTIVITY_MENTION", "ACTIVITY_REPLY_LIKE",
    "THREAD_COMMENT_MENTION", "THREAD_SUBSCRIBED", "THREAD_COMMENT_REPLY", "THREAD_COMMENT_LIKE",
    "THREAD_LIKE",
    "FOLLOWING", "AIRING"
  ]
};

browser.alarms.create("notifCheck", {
  periodInMinutes: 10
});

function updateNotifs() {
  return new Promise((resolve, reject) => {
    getSettings().then(r => {
      let settings = r[0];
      if (settings.notifsEnable) {
        browser.storage.sync.get(["token"]).then(r => {
          if (r.token) {
            let query = makeQueryString({ resetNotificationCount: settings.notifsUnreadResetOnQuery });
            api(query, variables, r.token)
              .then(data => {
                let notifsCurrent = data.Page.notifications;
                browser.storage.local.get(["notifcache"]).then(r => {
                  let notifsCached = r.notifcache ? JSON.parse(r.notifcache) : [];
                  let notifsCachedIds = notifsCached.map(notif => notif.id);
                  let notifsNew = notifsCurrent.filter(notif => notifsCachedIds.indexOf(notif.id) === -1);

                  let end = /\sFirefox\/\d+\.\d+$/.test(navigator.userAgent) ? 1 : notifsNew.length;

                  for (let i = 0; i < end; i++) {
                    let notif = notifsNew[i];
                    let text = "";
                    if (notif.type === "AIRING") {
                      text = `${notif.contexts[0]}${notif.episode}${notif.contexts[1]}${notif.media.title.userPreferred}${notif.contexts[2]}`;
                    } else {
                      text = `${notif.user.name}${notif.context}`;
                    }
                    fetch(notif.media ? notif.media.coverImage.large : notif.user.avatar.large).then(r => {
                      r.blob().then(blob => {
                        let blobUrl = URL.createObjectURL(blob);
                        console.log("creating notif", text, blobUrl)
                        browser.notifications.create(`anilist_${notif.id}`, {
                          type: "basic",
                          iconUrl: blobUrl,
                          message: text,
                          title: "AniList Enhancement Suite",
                          eventTime: new Date(notif.createdAt * 1000).getTime()
                        });
                      });
                    });
                  }

                  browser.storage.local.set({ "notifcache": JSON.stringify(notifsCurrent) }).then(function() {
                    resolve(notifsCurrent);
                  });
                });
              })
              .catch(error => {
                reject(error);
              });
          }
        });
      }
    });
  });
}

browser.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === "notifCheck") {
    updateNotifs();
  }
});

browser.runtime.onMessage.addListener(async (request, sender) => {
  if (request.command === "notifCheck") {
    return await updateNotifs().then(notifs => {
      return { notifs };
    });
  }
  // return true; // allow async respond()
});

browser.notifications.onClicked.addListener(notifId => {
  let idSplit = notifId.split("_");
  if (idSplit[0] === "anilist" && idSplit[1]) {
    browser.storage.local.get(["notifcache"]).then(r => {
      if (r.notifcache) {
        let notifs = JSON.parse(r.notifcache);
        let matches = notifs.filter(notif => notif.id === Number(idSplit[1]));
        if (matches[0]) {
          let notif = matches[0];
          let url;
          let typeSplit = notif.type.split("_");
          if (typeSplit[0] === "ACTIVITY") {
            url = `https://anilist.co/activity/${notif.activityId}`;
          } else if (notif.type === "AIRING") {
            url = `https://anilist.co/${notif.media.type.toLowerCase()}/${notif.media.id}`;
          } else if (notif.type === "FOLLOWING") {
            url = `https://anilist.co/user/${notif.user.name}`;
          } else if (notifSplit[0] === "THREAD" && notifSplit[1] === "COMMENT" || notifSplit[1] === "SUBSCRIBED") {
            url = `https://anilist.co/forum/thread/${notif.thread.id}/comment/${notif.commentId}`;
          } else if (notif.type === "THREAD_LIKE") {
            url = `https://anilist.co/forum/thread/${notif.threadId}`;
          }
          if (url) {
            browser.windows.getCurrent()
              .then(currentWindow => {
                if (typeof currentWindow === "undefined") {
                  browser.windows.create({ url });
                } else {
                  browser.tabs.create({ url }); // defaults to current window
                }
              })
              .catch(e => {
                browser.windows.create({ url });
              });
          }
        }
      }
    });
  }
});
